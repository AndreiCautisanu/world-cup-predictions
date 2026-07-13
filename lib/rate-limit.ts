/**
 * Minimal in-memory sliding-window rate limiter. Per-process, not shared
 * across instances — Railway runs a single main-node service so this is
 * sufficient for the invite-code register flow and login throttling.
 *
 * Each call to `check(key)` records a hit at `Date.now()` and returns whether
 * the caller is within the limit. Old hits are pruned lazily.
 */

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const bucket = buckets.get(key) ?? { hits: [] };
  // Prune hits older than the window.
  bucket.hits = bucket.hits.filter((t) => t > cutoff);
  bucket.hits.push(now);
  buckets.set(key, bucket);

  if (bucket.hits.length > limit) {
    const oldest = bucket.hits[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSeconds };
  }
  return {
    ok: true,
    remaining: Math.max(0, limit - bucket.hits.length),
    retryAfterSeconds: 0,
  };
}

export function clientIp(req: Request): string {
  // Railway sits behind a proxy that sets X-Forwarded-For.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
