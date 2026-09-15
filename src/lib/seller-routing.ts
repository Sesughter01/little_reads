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
 * Where should an already-authenticated user land for a given seller access
 * state? Used by the seller login intent and by /seller pages.
 */
export function sellerPostLoginDestination(state: SellerAccessState): string {
  switch (state) {
    case 'approved':
      return '/seller';
    case 'pending':
      return '/seller/pending';
    case 'rejected':
    case 'suspended':
      return '/seller/status';
    case 'no-profile':
      return '/seller/onboarding';
    case 'anonymous':
      return '/login?redirect=/seller';
  }
}

/** Parse a client-supplied signup/login intent. Anything else → 'buyer'. */
export function parseSignupIntent(value: unknown): 'buyer' | 'seller' {
  return value === 'seller' ? 'seller' : 'buyer';
}

/** Parse a client-supplied login intent. Anything else → 'buyer'. */
export function parseLoginIntent(value: unknown): 'buyer' | 'seller' {
  return value === 'seller' ? 'seller' : 'buyer';
}

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
 * Visitors are sent to signup with the seller intent hint (display-only);
 * authenticated users are routed by their authoritative seller profile state.
 */
export function sellerEntryHref(state: SellerAccessState): string {
  switch (state) {
    case 'anonymous':
      return '/register?intent=seller';
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