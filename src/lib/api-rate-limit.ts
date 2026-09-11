/**
 * Server-side API rate limiting (fixed window, per process instance).
 *
 * Supabase rate-limits its own auth endpoints, but the application's public
 * write APIs (contact, newsletter, reviews) and authenticated action APIs
 * (checkout, reconcile, avatar upload) had NO server-side throttle: a script
 * could flood the database or churn Paystack verification calls unchecked.
 *
 * Implementation notes:
 *   - Fixed-window counters in a module-level Map. On Vercel serverless each
 *     lambda instance has its own map, so limits are approximate (per
 *     instance) — this is a deliberate tradeoff: no external dependency, and
 *     it still raises the bar against naive spam by an order of magnitude.
 *   - Keys are namespaced per concern (`contact:<ip>`, `checkout:<userId>`)
 *     so limits are independent.
 *   - Expired buckets are pruned lazily once the map grows, keeping memory
 *     bounded without a timer.
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

/** Prune when the map exceeds this many keys. */
const PRUNE_THRESHOLD = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets (for Retry-After). */
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  // Lazy prune: bounded memory without a background timer.
  if (store.size > PRUNE_THRESHOLD) {
    for (const [k, bucket] of store) {
      if (bucket.resetAt <= now) store.delete(k);
    }
  }

  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      retryAfterSeconds: 0,
    };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;

  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Test helper — wipes all counters. */
export function resetRateLimits(): void {
  store.clear();
}

/**
 * Best-effort client IP for anonymous throttling. Vercel populates
 * x-forwarded-for; local dev falls back to 'unknown' so all local calls
 * share one bucket (fine for development).
 */
export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Build a standard 429 response for a denied request. */
export function tooManyRequestsResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please slow down and try again shortly.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSeconds),
      },
    }
  );
}
