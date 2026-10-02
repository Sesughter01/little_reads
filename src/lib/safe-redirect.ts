/**
 * Safe internal redirect validation.
 *
 * The `?redirect=` / `?next=` parameters accept ONLY relative, same-app paths
 * (e.g. `/account`, `/checkout/success?ref=LR-123`). Everything else is
 * rejected and replaced with a default destination. This closes the classic
 * open-redirect hole:
 *
 *   /login?redirect=https://evil.example
 *   /login?redirect=//evil.example
 *   /login?redirect=%2F%2Fevil.example
 *   /login?redirect=\/evil.example
 *
 * Kept dependency-free so both browser clients and the auth callback can use
 * it without pulling server modules into the bundle.
 */

/** Destinations that would create redirect loops after sign-in. */
const SELF_AUTH_PATHS = new Set(['/login', '/register']);

/** Destinations that are only reachable mid-flow (recovery link landing). */
const MID_FLOW_ONLY_PATHS = new Set(['/forgot-password', '/reset-password']);

const BLOCKED_PATHS = new Set([...SELF_AUTH_PATHS, ...MID_FLOW_ONLY_PATHS]);

/** Maximum accepted length — deep links are short; junk is not welcome. */
const MAX_REDIRECT_LENGTH = 512;

/** Control characters (including newline/tab) must never appear in a URL. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** Windows-style separators that browsers may treat as slashes. */
const BACKSLASH_PREFIX = /^\\/;
/** Protocol-relative scheme-relative forms: `//host`, `/\host`, `\\/host`. */
const SCHEME_RELATIVE = /^[/\\]{2}/;
/** An absolute path must start with a single forward slash. */
const ABSOLUTE_PATH = /^\/[^/\\]/;

/**
 * Decide whether a raw `?redirect=`/`?next=` value is a safe internal path.
 *
 * Accepts absolute in-app paths (with query/hash), and a small allowlist of
 * relative forms (`checkout`, `checkout/success`), which are resolved against
 * the app root — never against the current page URL.
 *
 * options.allowMidFlowOnly — used by the PKCE auth callback, which
 * legitimately receives ?next=/reset-password for the recovery flow. When
 * set, mid-flow-only pages (/reset-password, /forgot-password) are accepted;
 * default post-sign-in validation keeps rejecting them.
 */
export function isSafeRedirectPath(
  value: string | null | undefined,
  options?: { allowMidFlowOnly?: boolean }
): boolean {
  const blockedPaths = options?.allowMidFlowOnly
    ? SELF_AUTH_PATHS
    : BLOCKED_PATHS;
  if (!value) return false;
  if (value.length > MAX_REDIRECT_LENGTH) return false;
  if (CONTROL_CHARS.test(value)) return false;

  // Decode once so percent-encoded tricks (`%2F%2Fhost`) are caught too.
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false; // malformed percent-encoding — reject
  }
  if (decoded !== value && !isSafeRedirectPath(decoded, options)) {
    return false;
  }

  // Any scheme (https:, javascript:, mailto:, custom:) is an external or
  // executable target — never a safe internal redirect.
  if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return false;
  if (SCHEME_RELATIVE.test(decoded)) return false;
  if (BACKSLASH_PREFIX.test(decoded)) return false;

  if (ABSOLUTE_PATH.test(decoded)) {
    // "/checkout" — strip the query/hash and check the path itself.
    const pathOnly = decoded.split(/[?#]/)[0];
    // Reject dot-segments: "/../admin" resolves inside the origin but is
    // never an intended destination.
    if (pathOnly.split('/').some((s) => s === '.' || s === '..')) return false;
    return !blockedPaths.has(pathOnly.toLowerCase());
  }

  // Relative forms: "checkout", "checkout/success" — no leading slash, no
  // dot-segments (no escaping the app root via `../`).
  if (/^[a-z0-9][a-z0-9-_./]*$/i.test(decoded)) {
    const segments = decoded.toLowerCase().split('/');
    if (segments.some((s) => s === '..' || s === '.')) return false;
    return !blockedPaths.has(`/${segments[0]}`);
  }

  return false;
}

/**
 * Validate a redirect candidate and return it, or fall back to a safe
 * default. Use this at the point of navigation.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string
): string {
  return isSafeRedirectPath(value) ? (value as string) : fallback;
}

/**
 * Auth-callback `?next=` validation helper.
 *
 * The PKCE auth callback legitimately receives `?next=/reset-password` for the
 * password-recovery flow, so this thin wrapper enables the mid-flow-only
 * allowlist. It is a pure function kept in this library (NOT in the route
 * module) so it is unit-testable without importing a Next.js route module.
 */
export function getSafeNext(value: string | null): string | null {
  return isSafeRedirectPath(value, { allowMidFlowOnly: true })
    ? value
    : null;
}
