/**
 * Sliding-window rate limiting behind a small interface, so the in-memory
 * implementation can be swapped for Redis (already in the stack) without
 * touching the callers.
 *
 * TODO(redis): the in-memory window is per server instance. With more than one
 * replica a client gets `limit` per instance; replace `createSlidingWindowLimiter`
 * with a Redis sorted-set implementation of `RateLimiter` when we scale out.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** When blocked: milliseconds until the oldest hit leaves the window. */
  retryAfterMs: number;
}

export interface RateLimiter {
  /** Counts one attempt for `key` and says whether it may proceed. */
  check(key: string): RateLimitResult;
}

export interface SlidingWindowOptions {
  limit: number;
  windowMs: number;
  /** Injected clock (ms); defaults to `Date.now`. */
  now?: () => number;
  /** Upper bound on tracked keys; the oldest are evicted beyond it. */
  maxKeys?: number;
}

export function createSlidingWindowLimiter(
  options: SlidingWindowOptions,
): RateLimiter & { size(): number } {
  const { limit, windowMs, now = Date.now, maxKeys = 10_000 } = options;
  if (!(limit >= 1) || !(windowMs >= 1)) throw new Error("rate limiter needs limit >= 1 and windowMs >= 1");

  // Map keeps insertion order: the first key is the least recently touched.
  const hits = new Map<string, number[]>();

  function prune(t: number) {
    for (const [key, times] of hits) {
      const live = times.filter((h) => t - h < windowMs);
      if (live.length === 0) hits.delete(key);
      else hits.set(key, live);
    }
  }

  return {
    size: () => hits.size,
    check(key) {
      const t = now();
      const times = (hits.get(key) ?? []).filter((h) => t - h < windowMs);

      if (times.length >= limit) {
        hits.delete(key);
        hits.set(key, times); // refresh recency; blocked attempts are not counted
        return { allowed: false, retryAfterMs: Math.max(1, windowMs - (t - times[0])) };
      }

      times.push(t);
      hits.delete(key);
      hits.set(key, times);

      if (hits.size > maxKeys) {
        prune(t);
        while (hits.size > maxKeys) {
          const oldest = hits.keys().next().value;
          if (oldest === undefined) break;
          hits.delete(oldest);
        }
      }
      return { allowed: true, retryAfterMs: 0 };
    },
  };
}

/**
 * Best-effort client address for the bucket key. `x-real-ip` first; otherwise
 * the LAST `x-forwarded-for` entry, which the platform proxy appended (the
 * first entries are whatever the client chose to send, so they are forgeable).
 * TODO(verify): confirm on Railway that its edge sets one of these as expected.
 */
export function clientIpFromHeaders(headers: { get(name: string): string | null }): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return forwarded && forwarded.length > 0 ? forwarded[forwarded.length - 1] : "unknown";
}
