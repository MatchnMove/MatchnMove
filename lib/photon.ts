import "server-only";

import { parsePhotonAddress, type AddressSuggestion } from "@/lib/address-search";

const cache = new Map<string, { expires: number; suggestions: AddressSuggestion[] }>();
const pending = new Map<string, Promise<AddressSuggestion[]>>();

/** Photon supports search-as-you-type; the public Nominatim API does not. */
export async function autocompletePhoton(query: string): Promise<AddressSuggestion[]> {
  const baseUrl = process.env.ADDRESS_AUTOCOMPLETE_BASE_URL?.trim() || "https://photon.komoot.io/api/";
  const key = `${baseUrl}:${query.trim().toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.suggestions;
  const existing = pending.get(key);
  if (existing) return existing;
  if (pending.size >= 8) throw new Error("Address suggestions are busy.");

  const request = (async () => {
    const url = new URL(baseUrl);
    url.search = new URLSearchParams({ q: query.trim(), limit: "8", lang: "en", countrycode: "NZ" }).toString();
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/json", "User-Agent": "MatchnMove/1.0 (https://www.matchnmove.co.nz; support@matchnmove.co.nz)" },
    });
    if (!response.ok) throw new Error(`Address autocomplete returned ${response.status}.`);
    const data = await response.json();
    if (!Array.isArray(data?.features)) throw new Error("Invalid address autocomplete response.");
    const seen = new Set<string>();
    const suggestions: AddressSuggestion[] = [];
    for (const feature of data.features) {
      if (!feature?.properties || typeof feature.properties !== "object") continue;
      const suggestion = parsePhotonAddress(feature.properties);
      if (!suggestion || seen.has(suggestion.label)) continue;
      seen.add(suggestion.label);
      suggestions.push(suggestion);
    }
    // Prefer the requested house number over fuzzy matches for nearby businesses.
    const number = query.trim().match(/^\d+[a-z]?(?=\s)/i)?.[0].toLowerCase();
    if (number) suggestions.sort((a, b) => Number(b.street.toLowerCase().startsWith(`${number} `)) - Number(a.street.toLowerCase().startsWith(`${number} `)));
    const result = suggestions.slice(0, 5);
    if (cache.size >= 500) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 300_000, suggestions: result });
    return result;
  })();
  pending.set(key, request);
  try { return await request; } finally { pending.delete(key); }
}
