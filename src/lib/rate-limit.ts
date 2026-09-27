type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  if (b.count >= limit) return { allowed: false, remaining: 0, resetAt: b.resetAt };
  b.count += 1;
  return { allowed: true, remaining: limit - b.count, resetAt: b.resetAt };
}

// periodic cleanup to avoid memory leak
if (typeof setInterval !== 'undefined') {
  // @ts-ignore
  if (!globalThis.__rateLimitCleanup) {
    // @ts-ignore
    globalThis.__rateLimitCleanup = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
    }, 60_000);
    // @ts-ignore
    globalThis.__rateLimitCleanup.unref?.();
  }
}
