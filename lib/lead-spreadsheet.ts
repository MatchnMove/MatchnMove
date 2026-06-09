import { JWT } from "google-auth-library";
import { SpreadsheetDeliveryStatus, type Prisma, type QuoteRequest } from "@prisma/client";
import { prisma } from "@/lib/db";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEET_VERIFIED_ID_SETTING_KEY = "lead_google_sheet_verified_id";
const DEFAULT_SHEET_NAME = "Leads";
const DEFAULT_PROCESS_LIMIT = 25;
const DEFAULT_MAX_ATTEMPTS = 10;
const LEADS_SHEET_ID = 0;
const README_SHEET_ID = 1;

export const LEAD_SPREADSHEET_HEADERS = [
  "Quote ID",
  "Received At (NZ)",
  "Lead Status",
  "Priority",
  "Customer Name",
  "Phone",
  "Email",
  "Move Date",
  "Date Flexible",
  "From Address",
  "From City",
  "From Region",
  "From Postcode",
  "From Country",
  "From Property",
  "From Details",
  "Bedrooms",
  "To Address",
  "To City",
  "To Region",
  "To Postcode",
  "To Country",
  "To Property",
  "To Details",
  "Items / Notes",
  "Mover Offered",
  "Mover Contact",
  "Outreach Status",
  "Follow-up Date",
  "Team Notes",
] as const;

type SpreadsheetMetadata = {
  currentProperty?: {
    floor?: unknown;
    hasLift?: unknown;
    storageSize?: unknown;
  };
  destinationProperty?: {
    knownType?: unknown;
    floor?: unknown;
    hasLift?: unknown;
    storageSize?: unknown;
    bedrooms?: unknown;
  };
  selectedItems?: Array<{
    item?: unknown;
    qty?: unknown;
  }>;
};

type GoogleSheetMetadata = {
  spreadsheetId?: string;
  properties?: {
    title?: string;
  };
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }>;
};

type GoogleValuesResponse = {
  values?: unknown[][];
};

type AccessTokenCache = {
  token: string;
  expiresAt: number;
};

const globalForLeadSpreadsheet = globalThis as typeof globalThis & {
  matchnMoveGoogleSheetsAccessToken?: AccessTokenCache;
  matchnMoveGoogleSheetsTokenPromise?: Promise<string>;
};

function getNumberEnv(name: string, fallback: number, minimum = 1) {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(Math.floor(parsed), minimum);
}

function parseEmails(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getConfig() {
  const editorEmails = parseEmails(process.env.GOOGLE_SHEETS_EDITOR_EMAILS);
  const editorSet = new Set(editorEmails);
  const viewerEmails = parseEmails(process.env.GOOGLE_SHEETS_VIEWER_EMAILS)
    .filter((email) => !editorSet.has(email));

  return {
    serviceAccountEmail: process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL?.trim().toLowerCase() ?? "",
    privateKey: (process.env.GOOGLE_SHEETS_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim(),
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() ?? "",
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME?.trim() || DEFAULT_SHEET_NAME,
    editorEmails,
    viewerEmails,
  };
}

function isConfigured() {
  const config = getConfig();
  return Boolean(config.serviceAccountEmail && config.privateKey && config.spreadsheetId && config.sheetName);
}

function getSpreadsheetUrl(spreadsheetId = getConfig().spreadsheetId) {
  return spreadsheetId ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit` : null;
}

function escapeSheetName(name: string) {
  return `'${name.replaceAll("'", "''")}'`;
}

function assertGoogleSheetsConfigured() {
  if (!isConfigured()) {
    throw new Error(
      "Google Sheets is not configured. Set GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_SPREADSHEET_ID, and GOOGLE_SHEETS_SHEET_NAME.",
    );
  }
}

async function refreshGoogleAccessToken() {
  assertGoogleSheetsConfigured();
  const { serviceAccountEmail, privateKey } = getConfig();
  const client = new JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const credentials = await client.authorize();
  if (!credentials.access_token) throw new Error("Google did not issue a Sheets API access token.");

  globalForLeadSpreadsheet.matchnMoveGoogleSheetsAccessToken = {
    token: credentials.access_token,
    expiresAt: credentials.expiry_date || Date.now() + 55 * 60_000,
  };
  return credentials.access_token;
}

async function getGoogleAccessToken(forceRefresh = false) {
  const cached = globalForLeadSpreadsheet.matchnMoveGoogleSheetsAccessToken;
  if (!forceRefresh && cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  if (!globalForLeadSpreadsheet.matchnMoveGoogleSheetsTokenPromise) {
    globalForLeadSpreadsheet.matchnMoveGoogleSheetsTokenPromise = refreshGoogleAccessToken().finally(() => {
      globalForLeadSpreadsheet.matchnMoveGoogleSheetsTokenPromise = undefined;
    });
  }
  return globalForLeadSpreadsheet.matchnMoveGoogleSheetsTokenPromise;
}

function getHttpRetryDelayMs(attempt: number) {
  return Math.min(500 * 2 ** Math.max(attempt - 1, 0), 8_000);
}

function getQueueRetryDelayMs(attempt: number) {
  const base = getNumberEnv("GOOGLE_SHEETS_RETRY_BASE_MS", 60_000);
  const maximum = getNumberEnv("GOOGLE_SHEETS_RETRY_MAX_MS", 6 * 60 * 60_000);
  return Math.min(base * 2 ** Math.max(attempt - 1, 0), maximum);
}

function getGoogleErrorMessage(status: number, body: unknown) {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: { status?: string; message?: string } }).error;
    if (error?.message) return `${error.status || "GoogleApiError"}: ${error.message}`;
  }
  return `Google Sheets API request failed with HTTP ${status}.`;
}

async function googleSheetsRequest(
  path: string,
  init: RequestInit = {},
  options: { retryTransient?: boolean } = {},
) {
  const retryTransient = options.retryTransient ?? true;
  let forceRefresh = false;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const token = await getGoogleAccessToken(forceRefresh);
    const response = await fetch(`${SHEETS_API}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      cache: "no-store",
    });

    if (response.ok) {
      if (response.status === 204) return null;
      return response.json().catch(() => null);
    }

    if (response.status === 401 && !forceRefresh) {
      globalForLeadSpreadsheet.matchnMoveGoogleSheetsAccessToken = undefined;
      forceRefresh = true;
      continue;
    }

    if (retryTransient && [429, 500, 502, 503, 504].includes(response.status) && attempt < 4) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : getHttpRetryDelayMs(attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    const body = await response.json().catch(() => null);
    throw new Error(getGoogleErrorMessage(response.status, body));
  }

  throw new Error("Google Sheets API request exhausted its retry limit.");
}

function parseSpreadsheetMetadata(value: Prisma.JsonValue | null): SpreadsheetMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as SpreadsheetMetadata;
}

function cleanCell(value: unknown, maximumLength = 5_000) {
  if (value === null || value === undefined) return "";
  const cleaned = String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
  return /^[=+\-@]/.test(cleaned) ? `'${cleaned}` : cleaned;
}

function formatNzDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-NZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Pacific/Auckland",
  }).format(value);
}

function formatDate(value: Date | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Pacific/Auckland",
  }).format(value);
}

function describeProperty(value: SpreadsheetMetadata["currentProperty"] | SpreadsheetMetadata["destinationProperty"]) {
  if (!value) return "";
  return [
    value.floor ? `Floor: ${cleanCell(value.floor, 100)}` : "",
    value.hasLift ? `Lift: ${cleanCell(value.hasLift, 20)}` : "",
    value.storageSize ? `Storage: ${cleanCell(value.storageSize, 100)}` : "",
    "knownType" in value && value.knownType ? `Type confirmed: ${cleanCell(value.knownType, 20)}` : "",
    "bedrooms" in value && value.bedrooms ? `Bedrooms: ${cleanCell(value.bedrooms, 20)}` : "",
  ].filter(Boolean).join(" | ");
}

function describeItems(quote: QuoteRequest) {
  const metadata = parseSpreadsheetMetadata(quote.transcriptFields);
  const selectedItems = Array.isArray(metadata.selectedItems)
    ? metadata.selectedItems
      .map((entry) => {
        const item = cleanCell(entry.item, 150);
        const qty = cleanCell(entry.qty, 20);
        return item ? `${qty || "1"} x ${item}` : "";
      })
      .filter(Boolean)
      .join(", ")
    : "";
  return [cleanCell(quote.movingWhat), selectedItems].filter(Boolean).join(" | ");
}

function getLeadPriority(moveDate: Date | null) {
  if (!moveDate) return "Date unknown";
  const daysUntilMove = Math.ceil((moveDate.getTime() - Date.now()) / 86_400_000);
  if (daysUntilMove <= 7) return "Urgent";
  if (daysUntilMove <= 21) return "Soon";
  return "Standard";
}

export function buildLeadSpreadsheetRow(quote: QuoteRequest) {
  const metadata = parseSpreadsheetMetadata(quote.transcriptFields);
  return [
    cleanCell(quote.id, 100),
    formatNzDateTime(quote.createdAt),
    "New",
    getLeadPriority(quote.moveDate),
    cleanCell(quote.name, 250),
    cleanCell(quote.phone, 100),
    cleanCell(quote.email, 320),
    formatDate(quote.moveDate),
    quote.dateFlexible ? "Yes" : "No",
    cleanCell(quote.fromAddress, 500),
    cleanCell(quote.fromCity, 200),
    cleanCell(quote.fromRegion, 200),
    cleanCell(quote.fromPostcode, 40),
    cleanCell(quote.fromCountry, 100),
    cleanCell(quote.fromPropertyType, 100),
    describeProperty(metadata.currentProperty),
    cleanCell(quote.bedrooms, 30),
    cleanCell(quote.toAddress, 500),
    cleanCell(quote.toCity, 200),
    cleanCell(quote.toRegion, 200),
    cleanCell(quote.toPostcode, 40),
    cleanCell(quote.toCountry, 100),
    cleanCell(quote.toPropertyType, 100),
    describeProperty(metadata.destinationProperty),
    describeItems(quote),
    "",
    "",
    "Not contacted",
    "",
    "",
  ];
}

async function getSpreadsheetMetadata() {
  const { spreadsheetId } = getConfig();
  return googleSheetsRequest(
    `${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,properties.title,sheets.properties`,
    { method: "GET" },
  ) as Promise<GoogleSheetMetadata>;
}

async function getExistingQuoteIds() {
  const { spreadsheetId, sheetName } = getConfig();
  const range = encodeURIComponent(`${escapeSheetName(sheetName)}!A2:A`);
  const response = await googleSheetsRequest(
    `${encodeURIComponent(spreadsheetId)}/values/${range}?majorDimension=COLUMNS&valueRenderOption=UNFORMATTED_VALUE`,
    { method: "GET" },
  ) as GoogleValuesResponse;
  return new Set(
    (response.values?.[0] ?? [])
      .filter((value): value is string => typeof value === "string" && Boolean(value))
      .map((value) => value.replace(/^'/, "")),
  );
}

async function appendLeadRow(quote: QuoteRequest) {
  const { spreadsheetId, sheetName } = getConfig();
  const range = encodeURIComponent(`${escapeSheetName(sheetName)}!A:AD`);
  await googleSheetsRequest(
    `${encodeURIComponent(spreadsheetId)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: [buildLeadSpreadsheetRow(quote)],
      }),
    },
    { retryTransient: false },
  );
}

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown spreadsheet delivery error.";
  return message
    .replace(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/g, "[redacted private key]")
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]")
    .slice(0, 2_000);
}

export async function deliverLeadSpreadsheetRow(deliveryId: string, knownQuoteIds?: Set<string>) {
  const current = await prisma.leadSpreadsheetDelivery.findUnique({
    where: { id: deliveryId },
    include: { quoteRequest: true },
  });

  if (!current || current.status === SpreadsheetDeliveryStatus.SYNCED) {
    return { synced: current?.status === SpreadsheetDeliveryStatus.SYNCED, skipped: true as const };
  }
  if (current.attempts >= current.maxAttempts) {
    return { synced: false, skipped: true as const, error: current.lastError || "Maximum attempts reached." };
  }

  const claim = await prisma.leadSpreadsheetDelivery.updateMany({
    where: {
      id: current.id,
      status: current.status,
      attempts: current.attempts,
    },
    data: {
      status: SpreadsheetDeliveryStatus.SENDING,
      attempts: { increment: 1 },
      lastError: null,
    },
  });
  if (claim.count !== 1) {
    return { synced: false, skipped: true as const, error: "Spreadsheet delivery was already claimed." };
  }

  const attempts = current.attempts + 1;
  try {
    const quoteIds = knownQuoteIds ?? await getExistingQuoteIds();
    if (!quoteIds.has(current.quoteRequestId)) {
      await appendLeadRow(current.quoteRequest);
      quoteIds.add(current.quoteRequestId);
    }

    await prisma.$transaction([
      prisma.leadSpreadsheetDelivery.update({
        where: { id: current.id },
        data: {
          status: SpreadsheetDeliveryStatus.SYNCED,
          syncedAt: new Date(),
          lastError: null,
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          action: "lead_google_sheet_row_synced",
          meta: {
            deliveryId: current.id,
            quoteRequestId: current.quoteRequestId,
            attempt: attempts,
          },
        },
      }),
    ]);
    return { synced: true, skipped: false as const };
  } catch (error) {
    const exhausted = attempts >= current.maxAttempts;
    const message = getErrorMessage(error);
    await prisma.leadSpreadsheetDelivery.update({
      where: { id: current.id },
      data: {
        status: exhausted ? SpreadsheetDeliveryStatus.FAILED : SpreadsheetDeliveryStatus.QUEUED,
        lastError: message,
        nextAttemptAt: new Date(Date.now() + getQueueRetryDelayMs(attempts)),
      },
    });
    return { synced: false, skipped: false as const, error: message };
  }
}

export async function processLeadSpreadsheetQueue(limit = DEFAULT_PROCESS_LIMIT) {
  if (!isConfigured()) {
    return { configured: false, connected: false, processed: 0, synced: 0, failed: 0, results: [] };
  }
  const config = getConfig();
  const verification = await prisma.platformSetting.findUnique({
    where: { key: SHEET_VERIFIED_ID_SETTING_KEY },
    select: { value: true },
  });
  if (verification?.value !== config.spreadsheetId) {
    return { configured: true, connected: false, processed: 0, synced: 0, failed: 0, results: [] };
  }

  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const now = new Date();
  const staleSendingMs = getNumberEnv("GOOGLE_SHEETS_SENDING_STALE_MS", 10 * 60_000);
  await prisma.leadSpreadsheetDelivery.updateMany({
    where: {
      status: SpreadsheetDeliveryStatus.SENDING,
      attempts: { lt: DEFAULT_MAX_ATTEMPTS },
      updatedAt: { lt: new Date(Date.now() - staleSendingMs) },
    },
    data: {
      status: SpreadsheetDeliveryStatus.QUEUED,
      nextAttemptAt: now,
      lastError: "Recovered from a stale spreadsheet delivery attempt.",
    },
  });

  const candidates = await prisma.leadSpreadsheetDelivery.findMany({
    where: {
      status: { in: [SpreadsheetDeliveryStatus.QUEUED, SpreadsheetDeliveryStatus.FAILED] },
      attempts: { lt: DEFAULT_MAX_ATTEMPTS },
      nextAttemptAt: { lte: now },
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: safeLimit,
  });
  if (candidates.length === 0) {
    return { configured: true, connected: true, processed: 0, synced: 0, failed: 0, results: [] };
  }

  const quoteIds = await getExistingQuoteIds();
  const results = [];
  for (const candidate of candidates) {
    const result = await deliverLeadSpreadsheetRow(candidate.id, quoteIds);
    results.push({ id: candidate.id, ...result });
  }
  return {
    configured: true,
    connected: true,
    processed: results.length,
    synced: results.filter((result) => result.synced).length,
    failed: results.filter((result) => result.error && !result.synced).length,
    results,
  };
}

function columnWidthRequests() {
  const widths = [190, 160, 145, 110, 190, 145, 220, 115, 110, 250, 145, 170, 110, 140, 145, 220, 90, 250, 145, 170, 110, 140, 145, 220, 340, 185, 185, 155, 145, 340];
  return widths.map((pixelSize, index) => ({
    updateDimensionProperties: {
      range: {
        sheetId: LEADS_SHEET_ID,
        dimension: "COLUMNS",
        startIndex: index,
        endIndex: index + 1,
      },
      properties: { pixelSize },
      fields: "pixelSize",
    },
  }));
}

function getReadMeRows() {
  return [
    ["Match 'n Move Lead Register", "Secure team operating guide"],
    ["Purpose", "New customer quote requests are added automatically. Use the operational columns on the right to record which mover was offered the lead and the outcome."],
    ["Source of truth", "The Match 'n Move Postgres database remains the authoritative record. Do not rename the Leads tab or remove the Quote ID column."],
    ["Access", "Share only with named Match 'n Move team members who need customer details. Keep General access set to Restricted and remove access immediately when a teammate leaves or changes role."],
    ["Customer privacy", "Use customer details only to arrange the requested moving quote. Do not export, resell, forward, or use the data for unrelated marketing."],
    ["Working method", "Filter by Lead Status, Priority, region, or move date. Update Mover Offered, Mover Contact, Outreach Status, Follow-up Date, and Team Notes as work progresses."],
    ["Protected input", "Customer text is sent using RAW input and neutralised if it begins with a spreadsheet formula character."],
    ["Support", "If automatic updates stop, an MFA-verified admin can open /admin/leads to view connection and retry status without exposing customer details in logs."],
  ];
}

async function ensureRequiredSheets(metadata: GoogleSheetMetadata) {
  const { spreadsheetId, sheetName } = getConfig();
  const sheets = metadata.sheets ?? [];
  const leads = sheets.find((sheet) => sheet.properties?.title === sheetName);
  const readMe = sheets.find((sheet) => sheet.properties?.title === "Read Me");
  const requests = [];

  if (!leads) {
    const firstSheet = sheets.find((sheet) => sheet.properties?.sheetId === LEADS_SHEET_ID);
    if (!firstSheet || sheets.length > 1) {
      throw new Error(`Use a new blank Google Sheet, then run setup again. The first tab will become "${sheetName}".`);
    }
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: LEADS_SHEET_ID,
          title: sheetName,
          gridProperties: {
            rowCount: 10_000,
            columnCount: LEAD_SPREADSHEET_HEADERS.length,
          },
        },
        fields: "title,gridProperties(rowCount,columnCount)",
      },
    });
  } else if (leads.properties?.sheetId !== LEADS_SHEET_ID) {
    throw new Error(`The "${sheetName}" tab must be the first tab in the spreadsheet. Move it to the far left and try again.`);
  }

  if (!readMe) {
    if (sheets.some((sheet) => sheet.properties?.sheetId === README_SHEET_ID)) {
      throw new Error('The second tab must be named "Read Me". Rename or remove the existing second tab and try again.');
    }
    requests.push({
      addSheet: {
        properties: {
          sheetId: README_SHEET_ID,
          title: "Read Me",
          gridProperties: { rowCount: 50, columnCount: 2 },
        },
      },
    });
  }

  if (requests.length > 0) {
    await googleSheetsRequest(`${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });
  }
}

async function writeProvisioningValues() {
  const { spreadsheetId, sheetName } = getConfig();
  await googleSheetsRequest(`${encodeURIComponent(spreadsheetId)}/values:batchUpdate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      valueInputOption: "RAW",
      data: [
        {
          range: `${escapeSheetName(sheetName)}!A1:AD1`,
          majorDimension: "ROWS",
          values: [[...LEAD_SPREADSHEET_HEADERS]],
        },
        {
          range: "'Read Me'!A1:B8",
          majorDimension: "ROWS",
          values: getReadMeRows(),
        },
      ],
    }),
  });
}

async function formatProvisionedSheets() {
  const { spreadsheetId } = getConfig();
  const requests = [
    {
      updateSheetProperties: {
        properties: {
          sheetId: LEADS_SHEET_ID,
          gridProperties: { frozenRowCount: 1 },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    {
      repeatCell: {
        range: { sheetId: LEADS_SHEET_ID, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 30 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.03, green: 0.18, blue: 0.37 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat",
      },
    },
    {
      repeatCell: {
        range: { sheetId: LEADS_SHEET_ID, startRowIndex: 1, endRowIndex: 10_000, startColumnIndex: 0, endColumnIndex: 30 },
        cell: {
          userEnteredFormat: {
            verticalAlignment: "TOP",
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat(verticalAlignment,wrapStrategy)",
      },
    },
    {
      setDataValidation: {
        range: { sheetId: LEADS_SHEET_ID, startRowIndex: 1, endRowIndex: 10_000, startColumnIndex: 2, endColumnIndex: 3 },
        rule: {
          condition: {
            type: "ONE_OF_LIST",
            values: ["New", "Contacting mover", "Offered", "Accepted", "Declined", "Closed"].map((userEnteredValue) => ({ userEnteredValue })),
          },
          strict: true,
          showCustomUi: true,
        },
      },
    },
    {
      setDataValidation: {
        range: { sheetId: LEADS_SHEET_ID, startRowIndex: 1, endRowIndex: 10_000, startColumnIndex: 27, endColumnIndex: 28 },
        rule: {
          condition: {
            type: "ONE_OF_LIST",
            values: ["Not contacted", "Contacted", "Waiting", "Accepted", "Declined", "No response"].map((userEnteredValue) => ({ userEnteredValue })),
          },
          strict: true,
          showCustomUi: true,
        },
      },
    },
    {
      updateSheetProperties: {
        properties: {
          sheetId: README_SHEET_ID,
          gridProperties: { frozenRowCount: 1 },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    {
      repeatCell: {
        range: { sheetId: README_SHEET_ID, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.03, green: 0.18, blue: 0.37 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 14 },
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat",
      },
    },
    {
      repeatCell: {
        range: { sheetId: README_SHEET_ID, startRowIndex: 1, endRowIndex: 8, startColumnIndex: 0, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            verticalAlignment: "TOP",
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat(verticalAlignment,wrapStrategy)",
      },
    },
    {
      autoResizeDimensions: {
        dimensions: {
          sheetId: README_SHEET_ID,
          dimension: "ROWS",
          startIndex: 0,
          endIndex: 8,
        },
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId: README_SHEET_ID, dimension: "COLUMNS", startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 190 },
        fields: "pixelSize",
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId: README_SHEET_ID, dimension: "COLUMNS", startIndex: 1, endIndex: 2 },
        properties: { pixelSize: 720 },
        fields: "pixelSize",
      },
    },
    ...columnWidthRequests(),
  ];

  await googleSheetsRequest(`${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });
}

export async function provisionLeadSpreadsheet(actorId: string) {
  assertGoogleSheetsConfigured();
  const metadata = await getSpreadsheetMetadata();
  await ensureRequiredSheets(metadata);
  await writeProvisioningValues();
  await formatProvisionedSheets();

  const config = getConfig();
  const webUrl = getSpreadsheetUrl(config.spreadsheetId);
  await prisma.$transaction([
    prisma.platformSetting.upsert({
      where: { key: SHEET_VERIFIED_ID_SETTING_KEY },
      update: { value: config.spreadsheetId },
      create: { key: SHEET_VERIFIED_ID_SETTING_KEY, value: config.spreadsheetId },
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId,
        action: "lead_google_sheet_verified",
        meta: {
          spreadsheetId: config.spreadsheetId,
          spreadsheetTitle: metadata.properties?.title || null,
          sheetName: config.sheetName,
          serviceAccountEmail: config.serviceAccountEmail,
        },
      },
    }),
  ]);

  return {
    spreadsheetTitle: metadata.properties?.title || "Google Sheet",
    sheetName: config.sheetName,
    webUrl,
  };
}

export async function retryLeadSpreadsheetDeliveries(actorId: string) {
  const result = await prisma.leadSpreadsheetDelivery.updateMany({
    where: {
      status: { in: [SpreadsheetDeliveryStatus.QUEUED, SpreadsheetDeliveryStatus.FAILED] },
    },
    data: {
      status: SpreadsheetDeliveryStatus.QUEUED,
      attempts: 0,
      nextAttemptAt: new Date(),
      lastError: null,
    },
  });
  await prisma.adminAuditLog.create({
    data: {
      actorId,
      action: "lead_google_sheet_deliveries_retried",
      meta: { count: result.count },
    },
  });
  return result.count;
}

export async function getLeadSpreadsheetDiagnostics() {
  const config = getConfig();
  const [verification, counts, recentDeliveries] = await Promise.all([
    prisma.platformSetting.findUnique({
      where: { key: SHEET_VERIFIED_ID_SETTING_KEY },
      select: { value: true },
    }),
    prisma.leadSpreadsheetDelivery.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.leadSpreadsheetDelivery.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        quoteRequestId: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        nextAttemptAt: true,
        syncedAt: true,
        lastError: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    configured: isConfigured(),
    connected: Boolean(config.spreadsheetId && verification?.value === config.spreadsheetId),
    serviceAccount: {
      email: config.serviceAccountEmail,
    },
    spreadsheet: {
      id: config.spreadsheetId,
      sheetName: config.sheetName,
      webUrl: getSpreadsheetUrl(config.spreadsheetId),
      editorEmails: config.editorEmails,
      viewerEmails: config.viewerEmails,
    },
    queue: {
      counts: Object.fromEntries(counts.map((item) => [item.status, item._count._all])),
      recentDeliveries,
    },
  };
}
