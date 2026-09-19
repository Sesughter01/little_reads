/**
 * Authentication INTENT — a UI hint, never an authorization input.
 *
 * LittleReads has ONE authentication system. The Login and Register pages let
 * the user say what they intend to do (Buy Books / Sell Books). That choice:
 *
 *   * is a TEMPORARY, per-tab hint in sessionStorage (gone when the tab closes),
 *   * is NEVER sent to Supabase, never written as a role, and never read by any
 *     server authorization check,
 *   * only decides WHICH SAFE DESTINATION to navigate to after authentication.
 *
 * The authoritative seller state always comes from the server
 * (GET /api/seller/access → getSellerAccess() → seller_profiles under RLS).
 * Seller approval stays admin-controlled: no client value, including a
 * hand-edited `?intent=`, can produce an 'approved' result.
 *
 * Pure and dependency-free (only the equally pure safe-redirect + the
 * type-only seller-routing import) so the whole decision is unit-testable —
 * see src/__tests__/auth-intent.test.ts.
 */

import { safeRedirectPath } from '@/lib/safe-redirect';
import type { SellerAccessState } from '@/lib/seller-routing';

export type AuthIntent = 'buy' | 'sell';

/** sessionStorage key for the temporary intent hint. */
export const AUTH_INTENT_STORAGE_KEY = 'littlereads_auth_intent';

/** Selector copy. */
export const AUTH_INTENT_LABELS: Record<AuthIntent, string> = {
  buy: 'Buy Books',
  sell: 'Sell Books',
};

/**
 * Normalize any raw value (query param, sessionStorage, hand-edited string) to
 * a known intent. ONLY the exact value 'sell' selects seller intent —
 * everything else (null, '', 'SELL', 'approved', 'admin', junk) is 'buy'.
 * Seller intent must be explicit and can never be smuggled in another shape.
 */
export function parseAuthIntent(raw: string | null | undefined): AuthIntent {
  return raw === 'sell' ? 'sell' : 'buy';
}

/** Read the stored intent WITHOUT consuming it. Never throws (SSR/private mode). */
export function readStoredAuthIntent(): AuthIntent {
  try {
    return parseAuthIntent(sessionStorage.getItem(AUTH_INTENT_STORAGE_KEY));
  } catch {
    return 'buy';
  }
}

/** Store the temporary intent hint. sessionStorage is per-tab, never authoritative. */
export function storeAuthIntent(intent: AuthIntent): void {
  try {
    sessionStorage.setItem(AUTH_INTENT_STORAGE_KEY, intent);
  } catch {
    /* storage unavailable — the in-memory selection still works */
  }
}

/** Forget the hint once it has been used, so it cannot leak into a later visit. */
export function clearStoredAuthIntent(): void {
  try {
    sessionStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

/**
 * Where a SELLER-intent user goes once authenticated — derived purely from the
 * authoritative server-side seller access state, so the client never chooses:
 *
 *   approved                 → /seller
 *   pending                  → /seller/pending
 *   rejected / suspended     → /seller/status
 *   no-profile               → /seller/onboarding  (apply to sell)
 *   anonymous / unknown      → /seller/onboarding  (safe, unguarded default;
 *                              the server re-verifies on submit and the
 *                              application is idempotent + never privileged)
 */
export function sellerIntentHref(
  state: SellerAccessState | null | undefined
): string {
  switch (state) {
    case 'approved':
      return '/seller';
    case 'pending':
      return '/seller/pending';
    case 'rejected':
    case 'suspended':
      return '/seller/status';
    case 'no-profile':
    case 'anonymous':
    default:
      return '/seller/onboarding';
  }
}

/**
 * Payment-return / recovery destinations (e.g. /checkout/success?ref=LR-…).
 * Losing these mid-flow would strand a paid order, so they outrank the
 * intent selector even for seller intent.
 */
export function isPaymentRecoveryPath(value: string): boolean {
  const path = value.split(/[?#]/)[0].toLowerCase();
  return path === '/checkout' || path.startsWith('/checkout/');
}

/**
 * The single post-authentication destination decision, shared by the login and
 * register pages. Order of precedence:
 *
 *   1. An explicit VALIDATED redirect (?redirect=/?next=) from the middleware
 *      or the PKCE callback — but for seller intent only when it is a payment
 *      recovery path, so the selector still means something.
 *   2. Seller intent  → sellerIntentHref(authoritative server state).
 *   3. Buy intent     → the caller's fallback (default /account).
 *
 * Every returned value is a validated internal path: unsafe candidates
 * (absolute URLs, //evil.com, /login, /register, malformed) are rejected and
 * the decision falls through to the next rule — never navigated raw.
 */
export function resolvePostAuthDestination(options: {
  intent: AuthIntent;
  /** Raw ?redirect= / ?next= value — validated here, never trusted. */
  redirect?: string | null;
  /** Authoritative seller state (server-derived); only used for seller intent. */
  sellerState?: SellerAccessState | null;
  /** Customer/fallback destination (validated). Defaults to /account. */
  fallback?: string;
}): string {
  const fallback = safeRedirectPath(options.fallback, '/account');

  const explicit = safeRedirectPath(options.redirect, '');
  if (explicit && (options.intent === 'buy' || isPaymentRecoveryPath(explicit))) {
    return explicit;
  }

  if (options.intent === 'sell') {
    return sellerIntentHref(options.sellerState);
  }

  return fallback;
}