type RateLimitEntry = { count: number; resetAt: number };

const globalForRateLimit = globalThis as typeof globalThis & {
  __matchnmoveRateLimitHits?: Map<string, RateLimitEntry>;
  __matchnmoveRateLimitLastSweep?: number;
};

const hits = globalForRateLimit.__matchnmoveRateLimitHits ?? new Map<string, RateLimitEntry>();
const MAX_TRACKED_KEYS = 10_000;
const SWEEP_INTERVAL_MS = 30_000;

if (!globalForRateLimit.__matchnmoveRateLimitHits) {
  globalForRateLimit.__matchnmoveRateLimitHits = hits;
}

function sweepExpiredEntries(now: number) {
  const lastSweep = globalForRateLimit.__matchnmoveRateLimitLastSweep ?? 0;
  const shouldSweep = hits.size >= MAX_TRACKED_KEYS || now - lastSweep >= SWEEP_INTERVAL_MS;
  if (!shouldSweep) return;

  for (const [key, entry] of hits.entries()) {
    if (entry.resetAt <= now) {
      hits.delete(key);
    }
  }

  globalForRateLimit.__matchnmoveRateLimitLastSweep = now;
}

export function rateLimit(key: string, max = 20, windowMs = 60_000) {
  const now = Date.now();
  sweepExpiredEntries(now);

  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= max) {
    return { allowed: false };
  }

  entry.count += 1;
  hits.set(key, entry);
  return { allowed: true };
}
