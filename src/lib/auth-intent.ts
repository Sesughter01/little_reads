/**
 * CUSTOMER post-authentication destinations.
 *
 * LittleReads has ONE customer authentication flow (/register, /login). There
 * is no Buy/Sell "intent" input any more: a normal customer signs in or
 * registers and lands on their account (or the validated `?redirect=`/`?next=`
 * destination they came from). Becoming an author is a SEPARATE journey that
 * starts at /seller/onboarding.
 *
 * This module keeps only what that flow genuinely needs:
 *   * safe-redirect validation (delegated to @/lib/safe-redirect), and
 *   * payment-recovery awareness, so a checkout return link is never dropped
 *     mid-payment.
 *
 * Nothing here grants, stores or infers authorization. Seller status always
 * comes from the server (GET /api/seller/access -> getSellerAccess() ->
 * seller_profiles under RLS), never from a client value.
 *
 * Pure and dependency-free so the whole decision is unit-testable — see
 * src/__tests__/auth-intent.test.ts.
 */

import { isSafeRedirectPath, safeRedirectPath } from '@/lib/safe-redirect';

/**
 * Payment-return / recovery destinations (e.g. /checkout/success?ref=LR-...).
 * Losing these mid-flow would strand a paid order, so they must always survive
 * as a validated post-auth destination.
 */
export function isPaymentRecoveryPath(value: string): boolean {
  const path = value.split(/[?#]/)[0].toLowerCase();
  return path === '/checkout' || path.startsWith('/checkout/');
}

/**
 * The single post-authentication destination decision for the customer flow.
 *
 * Precedence:
 *   1. An explicit VALIDATED `?redirect=` / `?next=` candidate (middleware or
 *      PKCE callback) — includes checkout-recovery links.
 *   2. The VALIDATED pending destination carried through email verification
 *      (`sessionStorage 'littlereads_pending_redirect'`).
 *   3. The validated fallback (default /account).
 *
 * Every returned value is a validated internal path: unsafe candidates
 * (absolute URLs, //evil.com, /login, /register, malformed) are skipped — never
 * navigated raw.
 */
export function resolvePostAuthDestination(options: {
  /** Raw ?redirect= / ?next= value — validated here, never trusted. */
  redirect?: string | null;
  /** Destination carried through email verification (already our own value). */
  pending?: string | null;
  /** Customer fallback destination (validated). Defaults to /account. */
  fallback?: string;
}): string {
  for (const candidate of [options.redirect, options.pending]) {
    if (candidate && isSafeRedirectPath(candidate)) {
      return candidate;
    }
  }
  return safeRedirectPath(options.fallback, '/account');
}
