import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import ExcelJS from "exceljs";
import { SpreadsheetDeliveryStatus, type Prisma, type QuoteRequest } from "@prisma/client";
import { prisma } from "@/lib/db";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const TOKEN_SETTING_KEY = "lead_spreadsheet_refresh_token";
const ACCOUNT_SETTING_KEY = "lead_spreadsheet_account";
const WEB_URL_SETTING_KEY = "lead_spreadsheet_web_url";
const DEFAULT_TABLE_NAME = "LeadsTable";
const DEFAULT_WORKBOOK_PATH = "Match-n-Move-Leads.xlsx";
const DEFAULT_PROCESS_LIMIT = 25;
const DEFAULT_MAX_ATTEMPTS = 10;

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

type MicrosoftTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

type MicrosoftAccount = {
  id: string;
  displayName: string;
  email: string;
  connectedAt: string;
};

type GraphDriveItem = {
  id: string;
  name: string;
  webUrl?: string;
};

type GraphTableRowsResponse = {
  value?: Array<{
    values?: unknown[][];
  }>;
  "@odata.nextLink"?: string;
};

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

type AccessTokenCache = {
  token: string;
  expiresAt: number;
};

const globalForLeadSpreadsheet = globalThis as typeof globalThis & {
  matchnMoveMicrosoftAccessToken?: AccessTokenCache;
  matchnMoveMicrosoftTokenPromise?: Promise<string>;
};

function getNumberEnv(name: string, fallback: number, minimum = 1) {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(Math.floor(parsed), minimum);
}

function getConfig() {
  const editorEmails = (process.env.LEADS_EXCEL_EDITOR_EMAILS || process.env.LEADS_EXCEL_TEAM_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const editorSet = new Set(editorEmails);
  const viewerEmails = (process.env.LEADS_EXCEL_VIEWER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => Boolean(email) && !editorSet.has(email));

  return {
    tenantId: process.env.MICROSOFT_TENANT_ID?.trim() ?? "",
    clientId: process.env.MICROSOFT_CLIENT_ID?.trim() ?? "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET?.trim() ?? "",
    ownerEmail: process.env.LEADS_EXCEL_OWNER_EMAIL?.trim().toLowerCase() ?? "",
    workbookPath: (process.env.LEADS_EXCEL_WORKBOOK_PATH?.trim() || DEFAULT_WORKBOOK_PATH).replace(/^\/+/, ""),
    tableName: process.env.LEADS_EXCEL_TABLE_NAME?.trim() || DEFAULT_TABLE_NAME,
    editorEmails,
    viewerEmails,
  };
}

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function getMicrosoftRedirectUri() {
  return `${getBaseUrl()}/api/admin/lead-spreadsheet/oauth/callback`;
}

function getEncryptionKey() {
  const configured = process.env.LEADS_EXCEL_ENCRYPTION_KEY?.trim();
  if (configured) {
    const decoded = /^[a-f0-9]{64}$/i.test(configured)
      ? Buffer.from(configured, "hex")
      : Buffer.from(configured, "base64");
    if (decoded.length === 32) return decoded;
    throw new Error("LEADS_EXCEL_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex value.");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("LEADS_EXCEL_ENCRYPTION_KEY is required in production.");
  }

  return createHash("sha256")
    .update(`${process.env.NEXTAUTH_SECRET || "development-secret"}:lead-spreadsheet`)
    .digest();
}

function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

function decryptSecret(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored Microsoft connection is invalid.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function encodeDrivePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

function getWorkbookGraphPath() {
  return `/me/drive/root:/${encodeDrivePath(getConfig().workbookPath)}:`;
}

function getWorkbookApiPath() {
  return `${getWorkbookGraphPath()}/workbook`;
}

function getOAuthScopes() {
  return ["offline_access", "openid", "profile", "email", "User.Read", "Files.ReadWrite"].join(" ");
}

function getTokenEndpoint() {
  const { tenantId } = getConfig();
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
}

function getAuthorizationEndpoint() {
  const { tenantId } = getConfig();
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`;
}

function assertMicrosoftAppConfigured() {
  const { tenantId, clientId, clientSecret, ownerEmail } = getConfig();
  if (!tenantId || !clientId || !clientSecret || !ownerEmail) {
    throw new Error("Microsoft Excel integration is not configured. Set MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and LEADS_EXCEL_OWNER_EMAIL.");
  }
}

export function getMicrosoftAuthorizationUrl(state: string) {
  assertMicrosoftAppConfigured();
  const { clientId } = getConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: getMicrosoftRedirectUri(),
    response_mode: "query",
    scope: getOAuthScopes(),
    state,
    prompt: "select_account",
  });
  return `${getAuthorizationEndpoint()}?${params.toString()}`;
}

async function parseMicrosoftTokenResponse(response: Response) {
  const token = (await response.json().catch(() => ({}))) as MicrosoftTokenResponse;
  if (!response.ok || !token.access_token) {
    const detail = token.error_description?.split("\r\n")[0] || token.error || `HTTP ${response.status}`;
    throw new Error(`Microsoft authorization failed: ${detail}`);
  }
  return token;
}

async function exchangeAuthorizationCode(code: string) {
  assertMicrosoftAppConfigured();
  const { clientId, clientSecret } = getConfig();
  const response = await fetch(getTokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: getMicrosoftRedirectUri(),
      grant_type: "authorization_code",
      scope: getOAuthScopes(),
    }),
    cache: "no-store",
  });
  return parseMicrosoftTokenResponse(response);
}

async function getStoredRefreshToken() {
  const setting = await prisma.platformSetting.findUnique({
    where: { key: TOKEN_SETTING_KEY },
    select: { value: true },
  });
  if (setting?.value) return decryptSecret(setting.value);
  return process.env.MICROSOFT_GRAPH_REFRESH_TOKEN?.trim() || null;
}

async function storeRefreshToken(refreshToken: string) {
  await prisma.platformSetting.upsert({
    where: { key: TOKEN_SETTING_KEY },
    update: { value: encryptSecret(refreshToken) },
    create: { key: TOKEN_SETTING_KEY, value: encryptSecret(refreshToken) },
  });
}

async function refreshMicrosoftAccessToken() {
  assertMicrosoftAppConfigured();
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error("Microsoft Excel is not connected. An MFA-verified admin must connect the dedicated Microsoft 365 account.");
  }

  const { clientId, clientSecret } = getConfig();
  const response = await fetch(getTokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: getOAuthScopes(),
    }),
    cache: "no-store",
  });
  const token = await parseMicrosoftTokenResponse(response);
  if (token.refresh_token && token.refresh_token !== refreshToken) {
    await storeRefreshToken(token.refresh_token);
  }

  globalForLeadSpreadsheet.matchnMoveMicrosoftAccessToken = {
    token: token.access_token!,
    expiresAt: Date.now() + Math.max((token.expires_in ?? 3600) - 300, 60) * 1000,
  };
  return token.access_token!;
}

async function getMicrosoftAccessToken(forceRefresh = false) {
  const cached = globalForLeadSpreadsheet.matchnMoveMicrosoftAccessToken;
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.token;

  if (!globalForLeadSpreadsheet.matchnMoveMicrosoftTokenPromise) {
    globalForLeadSpreadsheet.matchnMoveMicrosoftTokenPromise = refreshMicrosoftAccessToken().finally(() => {
      globalForLeadSpreadsheet.matchnMoveMicrosoftTokenPromise = undefined;
    });
  }
  return globalForLeadSpreadsheet.matchnMoveMicrosoftTokenPromise;
}

function getRetryDelayMs(attempt: number) {
  return Math.min(500 * 2 ** Math.max(attempt - 1, 0), 8_000);
}

function getQueueRetryDelayMs(attempt: number) {
  const base = getNumberEnv("LEADS_EXCEL_RETRY_BASE_MS", 60_000);
  const maximum = getNumberEnv("LEADS_EXCEL_RETRY_MAX_MS", 6 * 60 * 60_000);
  return Math.min(base * 2 ** Math.max(attempt - 1, 0), maximum);
}

function getGraphErrorMessage(status: number, body: unknown) {
  if (body && typeof body === "object" && "error" in body) {
    const graphError = (body as { error?: { code?: string; message?: string } }).error;
    if (graphError?.message) return `${graphError.code || "GraphError"}: ${graphError.message}`;
  }
  return `Microsoft Graph request failed with HTTP ${status}.`;
}

async function graphRequest(
  pathOrUrl: string,
  init: RequestInit = {},
  options: { allowedStatuses?: number[]; parseJson?: boolean; retryTransient?: boolean } = {},
) {
  const allowedStatuses = options.allowedStatuses ?? [];
  const parseJson = options.parseJson ?? true;
  const retryTransient = options.retryTransient ?? true;
  let forceRefresh = false;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const token = await getMicrosoftAccessToken(forceRefresh);
    const response = await fetch(pathOrUrl.startsWith("https://") ? pathOrUrl : `${GRAPH_BASE_URL}${pathOrUrl}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      cache: "no-store",
    });

    if (allowedStatuses.includes(response.status) && !response.ok) return null;
    if (response.ok) {
      if (!parseJson || response.status === 204) return null;
      return response.json().catch(() => null);
    }

    if (response.status === 401 && !forceRefresh) {
      globalForLeadSpreadsheet.matchnMoveMicrosoftAccessToken = undefined;
      forceRefresh = true;
      continue;
    }

    if (retryTransient && [429, 500, 502, 503, 504].includes(response.status) && attempt < 4) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : getRetryDelayMs(attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    const body = await response.json().catch(() => null);
    throw new Error(getGraphErrorMessage(response.status, body));
  }

  throw new Error("Microsoft Graph request exhausted its retry limit.");
}

export async function connectMicrosoftLeadSpreadsheet(code: string, actorId: string) {
  const token = await exchangeAuthorizationCode(code);
  if (!token.refresh_token) {
    throw new Error("Microsoft did not return a refresh token. Reconnect and approve offline access.");
  }

  globalForLeadSpreadsheet.matchnMoveMicrosoftAccessToken = {
    token: token.access_token!,
    expiresAt: Date.now() + Math.max((token.expires_in ?? 3600) - 300, 60) * 1000,
  };

  const profile = await graphRequest("/me?$select=id,displayName,mail,userPrincipalName", {
    method: "GET",
  }) as {
    id?: string;
    displayName?: string;
    mail?: string;
    userPrincipalName?: string;
  };
  const account: MicrosoftAccount = {
    id: profile.id || "unknown",
    displayName: profile.displayName || "Microsoft 365 account",
    email: profile.mail || profile.userPrincipalName || "unknown",
    connectedAt: new Date().toISOString(),
  };
  const expectedOwnerEmail = getConfig().ownerEmail;
  const connectedEmails = new Set(
    [profile.mail, profile.userPrincipalName]
      .map((email) => email?.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!connectedEmails.has(expectedOwnerEmail)) {
    globalForLeadSpreadsheet.matchnMoveMicrosoftAccessToken = undefined;
    throw new Error(`Connect the dedicated Microsoft 365 account configured as ${expectedOwnerEmail}.`);
  }

  await prisma.$transaction([
    prisma.platformSetting.upsert({
      where: { key: TOKEN_SETTING_KEY },
      update: { value: encryptSecret(token.refresh_token) },
      create: { key: TOKEN_SETTING_KEY, value: encryptSecret(token.refresh_token) },
    }),
    prisma.platformSetting.upsert({
      where: { key: ACCOUNT_SETTING_KEY },
      update: { value: JSON.stringify(account) },
      create: { key: ACCOUNT_SETTING_KEY, value: JSON.stringify(account) },
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId,
        action: "lead_spreadsheet_microsoft_connected",
        meta: { microsoftAccountId: account.id, microsoftAccountEmail: account.email },
      },
    }),
  ]);

  return account;
}

export async function disconnectMicrosoftLeadSpreadsheet(actorId: string) {
  globalForLeadSpreadsheet.matchnMoveMicrosoftAccessToken = undefined;
  await prisma.$transaction([
    prisma.platformSetting.deleteMany({ where: { key: { in: [TOKEN_SETTING_KEY, ACCOUNT_SETTING_KEY] } } }),
    prisma.adminAuditLog.create({
      data: {
        actorId,
        action: "lead_spreadsheet_microsoft_disconnected",
      },
    }),
  ]);
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

async function getExistingQuoteIds() {
  const { tableName } = getConfig();
  let nextUrl: string | undefined = `${GRAPH_BASE_URL}${getWorkbookApiPath()}/tables/${encodeURIComponent(tableName)}/rows?$select=values`;
  const ids = new Set<string>();
  let pageCount = 0;

  while (nextUrl) {
    pageCount += 1;
    if (pageCount > 1_000) throw new Error("Lead workbook is too large to verify safely.");
    const page = await graphRequest(nextUrl, { method: "GET" }) as GraphTableRowsResponse;
    for (const row of page.value ?? []) {
      const quoteId = row.values?.[0]?.[0];
      if (typeof quoteId === "string" && quoteId) ids.add(quoteId.replace(/^'/, ""));
    }
    nextUrl = page["@odata.nextLink"];
  }

  return ids;
}

async function appendLeadRow(quote: QuoteRequest) {
  const { tableName } = getConfig();
  await graphRequest(`${getWorkbookApiPath()}/tables/${encodeURIComponent(tableName)}/rows/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      index: null,
      values: [buildLeadSpreadsheetRow(quote)],
    }),
  }, { retryTransient: false });
}

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown spreadsheet delivery error.";
  return message.replace(/(refresh_token|client_secret|access_token)=[^&\s]+/gi, "$1=[redacted]").slice(0, 2_000);
}

async function hasMicrosoftConnection() {
  const setting = await prisma.platformSetting.findUnique({
    where: { key: TOKEN_SETTING_KEY },
    select: { key: true },
  });
  return Boolean(setting || process.env.MICROSOFT_GRAPH_REFRESH_TOKEN?.trim());
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
          action: "lead_spreadsheet_row_synced",
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
  const config = getConfig();
  const appConfigured = Boolean(config.tenantId && config.clientId && config.clientSecret && config.ownerEmail);
  const connected = appConfigured ? await hasMicrosoftConnection() : false;
  if (!appConfigured || !connected) {
    return { configured: appConfigured, connected, processed: 0, synced: 0, failed: 0, results: [] };
  }

  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const now = new Date();
  const staleSendingMs = getNumberEnv("LEADS_EXCEL_SENDING_STALE_MS", 10 * 60_000);
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

function configureLeadWorksheet(worksheet: ExcelJS.Worksheet) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.properties.defaultRowHeight = 20;
  worksheet.addTable({
    name: getConfig().tableName,
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium2",
      showFirstColumn: false,
      showLastColumn: false,
      showRowStripes: true,
      showColumnStripes: false,
    },
    columns: LEAD_SPREADSHEET_HEADERS.map((name) => ({ name })),
    rows: [],
  });

  const widths = [24, 21, 18, 14, 24, 18, 28, 14, 14, 34, 20, 22, 14, 18, 18, 28, 12, 34, 20, 22, 14, 18, 18, 28, 48, 24, 24, 20, 18, 48];
  worksheet.columns.forEach((column, index) => {
    column.width = widths[index] ?? 18;
    column.alignment = { vertical: "top", wrapText: true };
  });
  worksheet.getRow(1).height = 32;
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  for (let row = 2; row <= 10_000; row += 1) {
    worksheet.getCell(`C${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"New,Contacting mover,Offered,Accepted,Declined,Closed"'],
    };
    worksheet.getCell(`AB${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Not contacted,Contacted,Waiting,Accepted,Declined,No response"'],
    };
  }
}

function configureReadMeWorksheet(worksheet: ExcelJS.Worksheet) {
  worksheet.columns = [{ width: 26 }, { width: 105 }];
  const rows = [
    ["Match 'n Move Lead Register", "Secure team operating guide"],
    ["Purpose", "New customer quote requests are added automatically. Use the operational columns on the right to record which mover was offered the lead and the outcome."],
    ["Source of truth", "The Match 'n Move Postgres database remains the authoritative record. Do not delete or rename the LeadsTable table, the Leads worksheet, or the Quote ID column."],
    ["Access", "Share only with named Match 'n Move team members who need customer details. Anonymous links and public sharing must stay disabled. Remove access immediately when a teammate leaves or changes role."],
    ["Customer privacy", "Use customer details only to arrange the requested moving quote. Do not export, resell, forward, or use the data for unrelated marketing."],
    ["Working method", "Filter by Lead Status, Priority, region, or move date. Update Mover Offered, Mover Contact, Outreach Status, Follow-up Date, and Team Notes as work progresses."],
    ["Protected input", "Customer text is written as plain text and neutralised if it begins with an Excel formula character. This protects the workbook from spreadsheet-formula injection."],
    ["Support", "If automatic updates stop, an MFA-verified admin can open /admin/leads to view connection and retry status without exposing customer details in logs."],
  ];
  worksheet.addRows(rows);
  worksheet.getRow(1).height = 34;
  worksheet.getRow(1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF082F5F" } };
  for (let row = 2; row <= rows.length; row += 1) {
    worksheet.getCell(`A${row}`).font = { bold: true, color: { argb: "FF082F5F" } };
    worksheet.getCell(`A${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF4FB" } };
    worksheet.getRow(row).alignment = { vertical: "top", wrapText: true };
    worksheet.getRow(row).height = 52;
  }
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

export async function buildLeadWorkbookBuffer() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Match 'n Move";
  workbook.company = "Match 'n Move";
  workbook.subject = "Secure customer lead operations register";
  workbook.title = "Match 'n Move Leads";
  workbook.created = new Date();
  workbook.modified = new Date();

  configureLeadWorksheet(workbook.addWorksheet("Leads"));
  configureReadMeWorksheet(workbook.addWorksheet("Read Me"));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function getWorkbookDriveItem() {
  return graphRequest(getWorkbookGraphPath(), { method: "GET" }, { allowedStatuses: [404] }) as Promise<GraphDriveItem | null>;
}

async function verifyWorkbookTable() {
  const { tableName } = getConfig();
  await graphRequest(`${getWorkbookApiPath()}/tables/${encodeURIComponent(tableName)}?$select=name`, { method: "GET" });
}

async function inviteWorkbookTeamMembers(itemId: string, sendInvitation: boolean) {
  const { editorEmails, viewerEmails } = getConfig();

  const invite = async (emails: string[], role: "read" | "write") => {
    if (emails.length === 0) return;
    await graphRequest(`/me/drive/items/${encodeURIComponent(itemId)}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipients: emails.map((email) => ({ email })),
        message: "You have been granted named-user access to the Match 'n Move lead register. Customer information is confidential and may only be used for fulfilling quote requests.",
        requireSignIn: true,
        sendInvitation,
        roles: [role],
      }),
    });
  };

  await invite(editorEmails, "write");
  await invite(viewerEmails, "read");
  return { editorsInvited: editorEmails.length, viewersInvited: viewerEmails.length };
}

export async function provisionLeadWorkbook(actorId: string) {
  let driveItem = await getWorkbookDriveItem();
  let created = false;

  if (driveItem) {
    await verifyWorkbookTable();
  } else {
    const workbook = await buildLeadWorkbookBuffer();
    driveItem = await graphRequest(`${getWorkbookGraphPath()}/content`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      body: workbook,
    }) as GraphDriveItem;
    created = true;
  }

  if (!driveItem?.id) throw new Error("Microsoft Graph did not return the workbook item.");
  const invitation = await inviteWorkbookTeamMembers(driveItem.id, created);

  await prisma.$transaction([
    prisma.platformSetting.upsert({
      where: { key: WEB_URL_SETTING_KEY },
      update: { value: driveItem.webUrl || "" },
      create: { key: WEB_URL_SETTING_KEY, value: driveItem.webUrl || "" },
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId,
        action: created ? "lead_spreadsheet_workbook_created" : "lead_spreadsheet_workbook_verified",
        meta: {
          workbookItemId: driveItem.id,
          workbookPath: getConfig().workbookPath,
          editorsInvited: invitation.editorsInvited,
          viewersInvited: invitation.viewersInvited,
        },
      },
    }),
  ]);

  return {
    created,
    workbookPath: getConfig().workbookPath,
    webUrl: driveItem.webUrl || null,
    editorsInvited: invitation.editorsInvited,
    viewersInvited: invitation.viewersInvited,
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
      action: "lead_spreadsheet_deliveries_retried",
      meta: { count: result.count },
    },
  });
  return result.count;
}

export async function getLeadSpreadsheetDiagnostics() {
  const config = getConfig();
  const [settings, counts, recentDeliveries] = await Promise.all([
    prisma.platformSetting.findMany({
      where: { key: { in: [TOKEN_SETTING_KEY, ACCOUNT_SETTING_KEY, WEB_URL_SETTING_KEY] } },
      select: { key: true, value: true, updatedAt: true },
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
  const settingMap = new Map(settings.map((setting) => [setting.key, setting]));
  const accountValue = settingMap.get(ACCOUNT_SETTING_KEY)?.value;
  let account: MicrosoftAccount | null = null;
  if (accountValue) {
    try {
      account = JSON.parse(accountValue) as MicrosoftAccount;
    } catch {
      account = null;
    }
  }

  return {
    configured: Boolean(config.tenantId && config.clientId && config.clientSecret && config.ownerEmail),
    connected: Boolean(settingMap.has(TOKEN_SETTING_KEY) || process.env.MICROSOFT_GRAPH_REFRESH_TOKEN?.trim()),
    account,
    workbook: {
      path: config.workbookPath,
      tableName: config.tableName,
      webUrl: settingMap.get(WEB_URL_SETTING_KEY)?.value || null,
      ownerEmail: config.ownerEmail,
      editorEmails: config.editorEmails,
      viewerEmails: config.viewerEmails,
    },
    queue: {
      counts: Object.fromEntries(counts.map((item) => [item.status, item._count._all])),
      recentDeliveries,
    },
  };
}
