/**
 * Anonymous-checkout redirect policy (shared by middleware.ts).
 *
 * Approved customer journey: Cart → Checkout → (no account) Register →
 * verify email → Login → back to Checkout.
 *
 * Route distinctions:
 *
 *   /checkout            → START of the purchase journey. A guest who has
 *                          never signed in must register first, so they are
 *                          sent to /register?redirect=/checkout.
 *   /checkout/*          → PAYMENT RETURN / recovery pages (e.g.
 *                          /checkout/success?ref=LR-…). The buyer already
 *                          had an account when the order was placed, so the
 *                          recovery path MUST be a sign-in — never a fresh
 *                          registration — and the full destination
 *                          (including the Paystack reference) is preserved
 *                          so reconciliation can continue after sign-in.
 *
 * The function is pure so the routing contract is unit-testable without
 * spinning up the middleware.
 */

export type CheckoutAnonymousDestination = {
  /** Where the anonymous visitor is sent. */
  path: '/register' | '/login';
  /**
   * The exact internal destination to carry in `?redirect=` — always a
   * same-app path (validated downstream by safeRedirectPath on consumption).
   */
  redirectTo: string;
};

export function resolveCheckoutAnonymousRedirect(
  pathname: string,
  search: string
): CheckoutAnonymousDestination | null {
  if (pathname === '/checkout') {
    return { path: '/register', redirectTo: '/checkout' };
  }
  if (pathname.startsWith('/checkout/')) {
    // Preserve the full intended destination (e.g. /checkout/success?ref=…)
    // so payment recovery survives the sign-in round-trip.
    return { path: '/login', redirectTo: `${pathname}${search}` };
  }
  return null;
}