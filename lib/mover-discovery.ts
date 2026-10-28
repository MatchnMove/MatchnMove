import { z } from "zod";
import { isValidNzbnChecksum } from "@/lib/nzbn-verification";

export const DISCOVERY_PAGE_SIZE = 20;
export const discoveryInputSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("search"),
      query: z
        .string()
        .trim()
        .min(2)
        .max(80)
        .regex(
          /^[\p{L}\p{N} &'().-]+$/u,
          "Use a business name or moving keyword.",
        ),
      page: z.number().int().min(1).max(100).default(1),
    })
    .strict(),
  z
    .object({
      action: z.literal("details"),
      nzbn: z
        .string()
        .regex(/^\d{13}$/)
        .refine(isValidNzbnChecksum, "Invalid NZBN."),
    })
    .strict(),
]);
export class DiscoveryError extends Error {
  constructor(
    message: string,
    public status = 502,
    public code = "LOOKUP_FAILED",
  ) {
    super(message);
  }
}
type RecordValue = Record<string, unknown>;
const record = (v: unknown): RecordValue =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as RecordValue)
    : {};
function text(v: unknown, max = 200) {
  return typeof v === "string"
    ? v
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .trim()
        .slice(0, max)
    : "";
}
function values(payload: RecordValue, keys: string[], fieldNames: string[]) {
  const result: string[] = [];
  for (const key of keys) {
    const raw = payload[key];
    const items = Array.isArray(raw)
      ? raw.slice(0, 30)
      : raw === undefined
        ? []
        : [raw];
    for (const item of items) {
      if (typeof item === "string") result.push(text(item, 500));
      else
        for (const field of fieldNames) {
          const value = record(item)[field];
          if (typeof value === "string") result.push(text(value, 500));
        }
    }
  }
  return [...new Set(result.filter(Boolean))];
}
export function safeDiscoveryWebsite(raw: string) {
  try {
    const candidate = raw.trim();
    const url = new URL(
      /^[a-z][a-z0-9+.-]*:/i.test(candidate)
        ? candidate
        : "https://" + candidate,
    );
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      !url.hostname.includes(".") ||
      url.hostname === "localhost" ||
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) ||
      url.hostname.endsWith(".local") ||
      url.hostname.includes(":")
    )
      return "";
    return url.toString().slice(0, 500);
  } catch {
    return "";
  }
}
export type DiscoveryCandidate = {
  provider?: "SERPAPI";
  placeId?: string;
  category?: string;
  nzbn: string;
  companyName: string;
  tradingNames: string[];
  status: string;
  inactive: boolean;
  website: string;
  email: string;
  phone: string;
  registryUrl: string;
};
export function parseDiscoveryCandidate(
  raw: unknown,
): DiscoveryCandidate | null {
  const entity = record(raw);
  const nzbn = text(entity.nzbn, 20);
  const companyName = text(entity.entityName ?? entity.legalName, 200);
  if (!isValidNzbnChecksum(nzbn) || !companyName) return null;
  const description = text(
    entity.entityStatusDescription ?? entity.entityStatus ?? entity.status,
    150,
  );
  const code = text(entity.entityStatusCode, 20);
  const status =
    description ||
    (code ? "Registry status code " + code : "Status not supplied");
  const emails = values(
    entity,
    ["emailAddresses", "emails", "emailAddress"],
    ["emailAddress", "email"],
  );
  const email =
    emails
      .find((value) => z.string().email().max(254).safeParse(value).success)
      ?.toLowerCase() ?? "";
  const websites = values(
    entity,
    ["websites", "website"],
    ["url", "website", "websiteAddress"],
  );
  const website = websites.map(safeDiscoveryWebsite).find(Boolean) ?? "";
  const phones = values(
    entity,
    ["phoneNumbers", "phones", "phone"],
    ["phoneNumber", "number"],
  );
  const phone = phones.find((v) => /^[+\d][\d ()-]{6,30}$/.test(v)) ?? "";
  return {
    nzbn,
    companyName,
    tradingNames: values(
      entity,
      ["tradingNames"],
      ["name", "tradingName"],
    ).slice(0, 5),
    status,
    inactive:
      /\b(removed|inactive|deregistered|ceased|closed|struck off|in liquidation|in receivership)\b/i.test(
        status,
      ),
    email,
    website,
    phone,
    registryUrl: "https://www.nzbn.govt.nz/mynzbn/nzbndetails/" + nzbn,
  };
}
export function parseDiscoverySearch(raw: unknown) {
  const payload = record(raw);
  if (!Array.isArray(payload.items))
    throw new DiscoveryError(
      "The register returned an unexpected response. Please try again later.",
    );
  const candidates = payload.items
    .slice(0, DISCOVERY_PAGE_SIZE)
    .map(parseDiscoveryCandidate)
    .filter((v): v is DiscoveryCandidate => v !== null);
  return {
    items: [...new Map(candidates.map((c) => [c.nzbn, c])).values()],
    hasMore: payload.items.length >= DISCOVERY_PAGE_SIZE,
  };
}
export function discoveryBaseUrl() {
  const value =
    process.env.NZBN_API_BASE_URL ||
    "https://api.business.govt.nz/gateway/nzbn/v5";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DiscoveryError(
      "The NZBN connection needs owner configuration.",
      503,
      "SETUP_REQUIRED",
    );
  }
  const local = ["127.0.0.1", "localhost"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (!local &&
      (url.protocol !== "https:" || url.hostname !== "api.business.govt.nz")) ||
    (local && process.env.NODE_ENV === "production")
  )
    throw new DiscoveryError(
      "Use the official NZBN API endpoint in the server configuration.",
      503,
      "SETUP_REQUIRED",
    );
  return url.toString().replace(/\/$/, "");
}
export function discoveryConfigured() {
  return Boolean(process.env.NZBN_API_SUBSCRIPTION_KEY?.trim());
}
async function fetchNzbn(path: string, fetcher: typeof fetch = fetch) {
  const key = process.env.NZBN_API_SUBSCRIPTION_KEY?.trim();
  if (!key)
    throw new DiscoveryError(
      "Connect the free NZBN API before searching. The owner needs to configure the server-side subscription key.",
      503,
      "SETUP_REQUIRED",
    );
  let response: Response;
  try {
    response = await fetcher(discoveryBaseUrl() + path, {
      headers: { Accept: "application/json", "Ocp-Apim-Subscription-Key": key },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    if (error instanceof DiscoveryError) throw error;
    throw new DiscoveryError(
      "The NZBN register could not be reached. Please try again shortly.",
      503,
      "PROVIDER_UNAVAILABLE",
    );
  }
  if (response.status === 401 || response.status === 403)
    throw new DiscoveryError(
      "The NZBN API key was not accepted. Ask the owner to check the subscription and environment.",
      503,
      "SETUP_REQUIRED",
    );
  if (response.status === 429)
    throw new DiscoveryError(
      "The register's request limit has been reached. Please wait before searching again.",
      429,
      "PROVIDER_LIMIT",
    );
  if (response.status === 404)
    throw new DiscoveryError(
      "This business is no longer available from the register.",
      404,
      "NOT_FOUND",
    );
  if (!response.ok)
    throw new DiscoveryError(
      "The NZBN register is temporarily unavailable.",
      503,
      "PROVIDER_UNAVAILABLE",
    );
  if (Number(response.headers.get("content-length") || 0) > 1500000)
    throw new DiscoveryError("The register response was too large.");
  const body = await response.text();
  if (body.length > 1500000)
    throw new DiscoveryError("The register response was too large.");
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new DiscoveryError("The register returned an unreadable response.");
  }
}
export async function searchNzbnMovers(
  query: string,
  page: number,
  fetcher?: typeof fetch,
) {
  const input = discoveryInputSchema.parse({ action: "search", query, page });
  if (input.action !== "search")
    throw new DiscoveryError("Invalid search.", 400);
  const params = new URLSearchParams({
    "search-term": input.query,
    page: String(input.page),
    "page-size": String(DISCOVERY_PAGE_SIZE),
  });
  return parseDiscoverySearch(
    await fetchNzbn("/entities?" + params.toString(), fetcher),
  );
}
export async function getDiscoveredMover(nzbn: string, fetcher?: typeof fetch) {
  discoveryInputSchema.parse({ action: "details", nzbn });
  const candidate = parseDiscoveryCandidate(
    await fetchNzbn("/entities/" + encodeURIComponent(nzbn), fetcher),
  );
  if (!candidate || candidate.nzbn !== nzbn)
    throw new DiscoveryError(
      "The register did not return the requested business.",
    );
  return candidate;
}
export function discoveryPrefill(candidate: DiscoveryCandidate) {
  return {
    companyName: candidate.companyName,
    email: candidate.email,
    phone: candidate.phone,
    website: candidate.website,
    contactName: "",
    operatingRegion: "",
    serviceAreas: [] as string[],
    serviceTypes: [] as string[],
    longDistance: false,
    consentBasis: "UNKNOWN",
    consentEvidence: "",
    duplicateReviewNote: "",
    notes:
      (candidate.provider === "SERPAPI"
        ? "Discovered on Google Maps through SerpApi.\nPlace ID: " +
          candidate.placeId
        : "Discovered through the public NZBN Register.\nNZBN: " +
          candidate.nzbn) +
      "\nSource: " +
      candidate.registryUrl +
      "\nRecorded status at review: " +
      candidate.status +
      "\nConfirm this is a moving business, its contact details and service coverage before outreach.",
  };
}
