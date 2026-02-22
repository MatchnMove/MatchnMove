const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (entry.count >= max) return { allowed: false };
  entry.count += 1;
  hits.set(key, entry);
  return { allowed: true };
}
