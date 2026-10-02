/**
 * Pure seller routing/decision helpers — no Next.js or Supabase imports.
 *
 * Kept side-effect free so the critical access decisions are unit-testable in
 * isolation (see src/__tests__/seller-routing.test.ts).
 */

export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type SellerAccessState =
  | 'anonymous'
  | 'no-profile'
  | 'pending'
  | 'rejected'
  | 'suspended'
  | 'approved';

/**
 * The sellers-cannot-buy-their-own-books rule as a pure predicate.
 *
 *   productSellerId === null      → platform book, always buyable
 *   sessionUserId === null        → anonymous (server re-checks after auth)
 *   otherwise                     → buyable UNLESS the user owns the listing
 *
 * This mirrors the server-side enforcement in /api/checkout.
 */
export function canBuyProduct(
  sessionUserId: string | null,
  productSellerId: string | null
): boolean {
  if (productSellerId === null) return true;
  if (sessionUserId === null) return true;
  return sessionUserId !== productSellerId;
}

/**
 * Where should the "Become an Author" entry-point CTA link for a given access
 * state? Pure routing — no auth, no fetch, unit-testable.
 *
 * Anonymous visitors go straight to the author APPLICATION entry point
 * (/seller/onboarding), which explains that an account is required and sends
 * them through the normal customer sign-in/register flow with a return path.
 * There is no seller-specific auth route and no `?sell=1` detour through the
 * customer registration page. Authenticated users are routed by their
 * authoritative seller profile state.
 */
export function sellerEntryHref(state: SellerAccessState): string {
  switch (state) {
    case 'anonymous':
      return '/seller/onboarding';
    case 'no-profile':
      return '/seller/onboarding';
    case 'pending':
      return '/seller/pending';
    case 'rejected':
    case 'suspended':
      return '/seller/status';
    case 'approved':
      return '/seller';
  }
}

/** Human label for seller statuses (UI copy). */
export const SELLER_STATUS_LABELS: Record<SellerStatus, string> = {
  pending: 'Pending Review',
  approved: 'Active',
  rejected: 'Application Rejected',
  suspended: 'Account Suspended',
};