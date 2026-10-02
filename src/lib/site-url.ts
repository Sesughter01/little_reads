/**
 * Environment URL strategy (Phase 2).
 *
 * LittleReads runs in three environments:
 *
 *   PRODUCTION  the canonical public site origin (env-scoped value)
 *   PREVIEW     the preview deployment origin (env-scoped value)
 *   LOCAL       configured privately via .env.local
 *
 * Vercel scopes ONE variable — NEXT_PUBLIC_SITE_URL — per environment:
 *
 *   Production:  the canonical public site origin
 *   Preview:     the preview deployment origin
 *   Development: supplied by .env.local
 *
 * Contract enforced here:
 *
 *   - no loopback origin is ever hardcoded in application auth code (local
 *     is a private, env-provided value only);
 *   - no production domain is hardcoded as a fallback (the correct value is
 *     always supplied by the environment);
 *   - multiple URLs are never packed into one variable (the value must parse
 *     as a single URL or it is rejected);
 *   - trailing slashes are normalized away.
 *
 * This module is used for AUTH flows (email verification / recovery links).
 * Payment callbacks are governed separately and stay pinned — see
 * checkout-callback.ts, which is intentionally NOT relaxed by this module.
 */

export type SiteUrlSource =
  | 'env' // valid single URL from NEXT_PUBLIC_SITE_URL
  | 'origin'; // last-resort server-side request origin fallback

export type ResolvedSiteUrl = {
  /** Normalized origin (no trailing slash), e.g. "https://example.com" */
  origin: string;
  source: SiteUrlSource;
};

/**
 * Normalize an origin: trim whitespace, strip trailing slashes.
 * Returns null for anything that is not a plausible origin string.
 */
export function normalizeSiteOrigin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Collapse any number of trailing slashes: "https://x.com///" → "https://x.com"
  const stripped = trimmed.replace(/\/+$/, '');
  return stripped || null;
}

/**
 * Validate that a value is exactly ONE URL (scheme + host, optional port /
 * path), not a list, not a loopback origin baked into code, and not a
 * protocol-relative or scheme-less host.
 *
 * Returns the normalized origin, or null when the value must be rejected.
 */
export function parseSingleSiteUrl(raw: string | null | undefined): string | null {
  const normalized = normalizeSiteOrigin(raw);
  if (!normalized) return null;

  // Reject multi-URL values ("https://a.com,https://b.com",
  // "https://a.com https://b.com", whitespace/control chars).
  if (/[\s,]/.test(normalized)) return null;

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return null; // not a URL at all (e.g. "example.com", "a.com,b.com")
  }

  // Must be http(s); anything else (ftp:, javascript:, mailto:) is invalid here.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  // A URL without a hostname cannot be an app origin.
  if (!parsed.hostname) return null;

  // Rebuild from components so query/hash/path junk is dropped and the
  // origin form is guaranteed (no trailing slash survives this either).
  return parsed.origin;
}

/**
 * Resolve the site origin for auth links in the CURRENT environment.
 *
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL (Vercel supplies the env-scoped value; local dev
 *      supplies it via .env.local)
 *   2. serverOrigin — the request's own origin, ONLY as a last-resort
 *      fallback on the server, and never assumed to be a loopback or the
 *      production domain by application code.
 *
 * Returns null when neither is usable — callers then surface a clear,
 * actionable configuration error instead of silently redirecting somewhere
 * wrong.
 */
export function resolveSiteUrl(serverOrigin?: string | null): ResolvedSiteUrl | null {
  const fromEnv = parseSingleSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromEnv) {
    return { origin: fromEnv, source: 'env' };
  }

  const fallback = parseSingleSiteUrl(serverOrigin);
  if (fallback) {
    return { origin: fallback, source: 'origin' };
  }

  return null;
}

/**
 * Auth-link origin for BROWSER clients — the one helper every auth form
 * should use instead of hand-rolling env reads.
 *
 * Returns the env-scoped NEXT_PUBLIC_SITE_URL validated as a single URL and
 * normalized (trailing slashes stripped), or null when it is unset or
 * invalid, so callers can surface an actionable configuration error.
 *
 * Deliberately NEVER falls back to window.location (an attacker-controlled
 * URL must not shape verification/recovery links) and never hardcodes a
 * domain. Server-side callers needing a request-origin fallback should use
 * resolveSiteUrl() instead.
 */
export function getEnvSiteOrigin(): string | null {
  return parseSingleSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}
