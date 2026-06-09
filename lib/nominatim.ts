import "server-only";

const DEFAULT_BASE_URL = "https://nominatim.openstreetmap.org";
const MIN_REQUEST_INTERVAL_MS = 1_050;
const REQUEST_TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const MAX_CACHE_ENTRIES = 500;
const MAX_QUEUED_REQUESTS = 8;

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const globalForNominatim = globalThis as typeof globalThis & {
  __matchnmoveNominatimCache?: Map<string, CacheEntry>;
  __matchnmoveNominatimQueue?: Promise<void>;
  __matchnmoveNominatimLastRequestAt?: number;
  __matchnmoveNominatimQueueDepth?: number;
};

const cache = globalForNominatim.__matchnmoveNominatimCache ?? new Map<string, CacheEntry>();

if (!globalForNominatim.__matchnmoveNominatimCache) {
  globalForNominatim.__matchnmoveNominatimCache = cache;
}

function getBaseUrl() {
  const configuredSearchUrl = process.env.ADDRESS_SEARCH_BASE_URL?.trim();
  if (!configuredSearchUrl) return DEFAULT_BASE_URL;

  return configuredSearchUrl.replace(/\/search\/?$/, "").replace(/\/$/, "");
}

function getCachedValue(key: string) {
  const entry = cache.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }

  return entry.value;
}

function cacheValue(key: string, value: unknown) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runThrottled<T>(operation: () => Promise<T>) {
  const queueDepth = globalForNominatim.__matchnmoveNominatimQueueDepth ?? 0;
  if (queueDepth >= MAX_QUEUED_REQUESTS) {
    throw new Error("Address provider is busy.");
  }

  globalForNominatim.__matchnmoveNominatimQueueDepth = queueDepth + 1;
  const previous = globalForNominatim.__matchnmoveNominatimQueue ?? Promise.resolve();

  let releaseQueue: () => void = () => undefined;
  globalForNominatim.__matchnmoveNominatimQueue = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });

  await previous.catch(() => undefined);

  try {
    const lastRequestAt = globalForNominatim.__matchnmoveNominatimLastRequestAt ?? 0;
    const waitMs = Math.max(0, MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (waitMs > 0) await delay(waitMs);

    globalForNominatim.__matchnmoveNominatimLastRequestAt = Date.now();
    return await operation();
  } finally {
    globalForNominatim.__matchnmoveNominatimQueueDepth = Math.max(
      0,
      (globalForNominatim.__matchnmoveNominatimQueueDepth ?? 1) - 1,
    );
    releaseQueue();
  }
}

export async function requestNominatim(path: "/search" | "/reverse", params: URLSearchParams) {
  const cacheKey = `${path}?${params.toString()}`;
  const cachedValue = getCachedValue(cacheKey);
  if (cachedValue !== undefined) return cachedValue;

  return runThrottled(async () => {
    const valueCachedWhileQueued = getCachedValue(cacheKey);
    if (valueCachedWhileQueued !== undefined) return valueCachedWhileQueued;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${getBaseUrl()}${path}?${params.toString()}`, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Accept-Language": "en-NZ",
          "User-Agent": "MatchnMove/1.0 (https://www.matchnmove.co.nz; support@matchnmove.co.nz)",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Address provider returned ${response.status}.`);
      }

      const data: unknown = await response.json();
      cacheValue(cacheKey, data);
      return data;
    } finally {
      clearTimeout(timeout);
    }
  });
}
