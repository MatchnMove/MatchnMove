import { z } from "zod";
import {
  DiscoveryError,
  safeDiscoveryWebsite,
  type DiscoveryCandidate,
} from "@/lib/mover-discovery";

const term = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[\p{L}\p{N} &'().-]+$/u);
const placeId = z
  .string()
  .min(5)
  .max(200)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const webDiscoveryInputSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("maps_search"),
      query: term,
      city: term,
      page: z.number().int().min(1).max(6).default(1),
    })
    .strict(),
  z.object({ action: z.literal("maps_details"), placeId }).strict(),
]);

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const clean = (v: unknown, max = 200) =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .trim()
        .slice(0, max)
    : "";
export function parseWebCandidate(raw: unknown): DiscoveryCandidate | null {
  const value = record(raw);
  const id = clean(value.place_id);
  const companyName = clean(value.title);
  if (!placeId.safeParse(id).success || !companyName) return null;
  // Opening hours (e.g. "Closed now") do not mean a business has ceased trading.
  const inactive =
    value.permanently_closed === true ||
    value.temporarily_closed === true ||
    /\b(?:permanently|temporarily) closed\b/i.test(clean(value.open_state));
  const phone = clean(value.phone, 40);
  return {
    provider: "SERPAPI",
    placeId: id,
    nzbn: "",
    companyName,
    tradingNames: [],
    category: clean(value.type, 120),
    status: inactive ? "Listing marked closed" : "Business status unverified",
    inactive,
    website: safeDiscoveryWebsite(clean(value.website, 500)),
    phone: /^[+\d][\d ()-]{6,30}$/.test(phone) ? phone : "",
    email: "", // Maps results do not supply a verified business email.
    registryUrl:
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(companyName) +
      "&query_place_id=" +
      encodeURIComponent(id),
  };
}
export function parseWebSearch(raw: unknown) {
  const payload = record(raw);
  // A successful empty Maps search also carries an `error` string in SerpApi.
  if (
    record(payload.search_information).local_results_state === "Fully empty" &&
    record(payload.search_metadata).status === "Success"
  )
    return { items: [], hasMore: false };
  if (payload.error) {
    // Do not echo upstream errors: they can contain account or request information.
    throw new DiscoveryError(
      "SerpApi could not complete this search. Check the account credits and try again.",
      503,
      "PROVIDER_UNAVAILABLE",
    );
  }
  // SerpApi can return a single place for an exact business-name query.
  const source = Array.isArray(payload.local_results)
    ? payload.local_results
    : payload.place_results
      ? [payload.place_results]
      : null;
  if (!source) {
    if (
      record(payload.search_information).local_results_state === "Fully empty"
    )
      return { items: [], hasMore: false };
    throw new DiscoveryError(
      "The search provider returned an unexpected response.",
    );
  }
  const candidates = source
    .slice(0, 20)
    .map(parseWebCandidate)
    .filter((v): v is DiscoveryCandidate => v !== null);
  return {
    items: [...new Map(candidates.map((c) => [c.placeId, c])).values()],
    hasMore: Boolean(record(payload.serpapi_pagination).next),
  };
}
export function webDiscoveryConfigured() {
  return Boolean(process.env.SERPAPI_API_KEY?.trim());
}
export function webDiscoveryDailyLimit() {
  const value = Number(process.env.MOVER_DISCOVERY_DAILY_LIMIT || 100);
  return Number.isInteger(value) && value >= 1 && value <= 10000 ? value : 100;
}
async function request(params: URLSearchParams, fetcher: typeof fetch = fetch) {
  const key = process.env.SERPAPI_API_KEY?.trim();
  if (!key)
    throw new DiscoveryError(
      "Connect SerpApi before searching. The owner needs to configure its server-side API key.",
      503,
      "SETUP_REQUIRED",
    );
  params.set("api_key", key);
  params.set("engine", "google_maps");
  params.set("hl", "en");
  params.set("gl", "nz");
  let response: Response;
  try {
    response = await fetcher(
      "https://serpapi.com/search.json?" + params.toString(),
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      },
    );
  } catch {
    throw new DiscoveryError(
      "The search provider could not be reached. Please try again shortly.",
      503,
      "PROVIDER_UNAVAILABLE",
    );
  }
  if (response.status === 401 || response.status === 403)
    throw new DiscoveryError(
      "SerpApi did not accept the API key. Ask the owner to check the account and server settings.",
      503,
      "SETUP_REQUIRED",
    );
  if (response.status === 429)
    throw new DiscoveryError(
      "SerpApi's request or credit limit was reached. Ask the owner to check the account.",
      429,
      "PROVIDER_LIMIT",
    );
  if (!response.ok)
    throw new DiscoveryError(
      "The search provider is temporarily unavailable.",
      503,
      "PROVIDER_UNAVAILABLE",
    );
  // Read a bounded stream; do not buffer an arbitrarily large upstream response.
  if (Number(response.headers.get("content-length") || 0) > 1500000)
    throw new DiscoveryError("The search response was too large.");
  const reader = response.body?.getReader();
  if (!reader)
    throw new DiscoveryError("The search provider returned an empty response.");
  let body = "",
    bytes = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1500000) {
        await reader.cancel();
        throw new DiscoveryError("The search response was too large.");
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } catch (error) {
    if (error instanceof DiscoveryError) throw error;
    throw new DiscoveryError(
      "The search response was interrupted. Please try again.",
    );
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new DiscoveryError(
      "The search provider returned an unreadable response.",
    );
  }
}
export async function searchWebMovers(
  query: string,
  city: string,
  page: number,
  fetcher?: typeof fetch,
) {
  const input = webDiscoveryInputSchema.parse({
    action: "maps_search",
    query,
    city,
    page,
  });
  if (input.action !== "maps_search")
    throw new DiscoveryError("Invalid search.", 400);
  return parseWebSearch(
    await request(
      new URLSearchParams({
        type: "search",
        q: input.query + " in " + input.city + ", New Zealand",
        start: String((input.page - 1) * 20),
      }),
      fetcher,
    ),
  );
}
export async function getWebMover(id: string, fetcher?: typeof fetch) {
  placeId.parse(id);
  const payload = record(
    await request(new URLSearchParams({ place_id: id }), fetcher),
  );
  if (payload.error)
    throw new DiscoveryError(
      "The business listing could not be retrieved. Check SerpApi credits and try again.",
      503,
    );
  const candidate = parseWebCandidate(payload.place_results);
  if (!candidate || candidate.placeId !== id)
    throw new DiscoveryError(
      "The search provider did not return the requested business.",
    );
  return candidate;
}
