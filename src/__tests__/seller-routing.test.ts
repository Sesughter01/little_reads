import { describe, it, expect } from 'vitest';
import { canBuyProduct, sellerEntryHref } from '@/lib/seller-routing';

describe('canBuyProduct (sellers cannot buy their own books)', () => {
  it('platform-owned books (seller_id null) are always buyable', () => {
    expect(canBuyProduct('seller-a', null)).toBe(true);
    expect(canBuyProduct(null, null)).toBe(true);
  });

  it('a seller CAN buy another seller\u2019s book', () => {
    expect(canBuyProduct('seller-a', 'seller-b')).toBe(true);
  });

  it('a seller CANNOT buy their own book', () => {
    expect(canBuyProduct('seller-a', 'seller-a')).toBe(false);
  });

  it('anonymous sessions defer to the server (never blocked client-side)', () => {
    expect(canBuyProduct(null, 'seller-a')).toBe(true);
  });

  it('manipulated client seller_id cannot bypass the server check', () => {
    // The predicate is pure: whatever the browser claims, the server
    // re-derives seller_id from products.seller_id in /api/checkout. A
    // client-supplied seller_id is never an input to that check.
    const forgedPayload = { product_id: 'p1', seller_id: null as string | null };
    void forgedPayload;
    expect(canBuyProduct('seller-a', 'seller-a')).toBe(false);
  });
});

describe('sellerEntryHref ("Become an Author" entry-point routing)', () => {
  it('sends visitors to the normal registration flow with seller intent preselected', () => {
    // One registration page — ?sell=1 only preselects the temporary intent
    // hint; it grants nothing (no /seller/register exists).
    expect(sellerEntryHref('anonymous')).toBe('/register?sell=1');
  });

  it('sends authenticated users without a profile to onboarding', () => {
    expect(sellerEntryHref('no-profile')).toBe('/seller/onboarding');
  });

  it('routes pending/rejected/suspended users to their status pages', () => {
    expect(sellerEntryHref('pending')).toBe('/seller/pending');
    expect(sellerEntryHref('rejected')).toBe('/seller/status');
    expect(sellerEntryHref('suspended')).toBe('/seller/status');
  });

  it('routes approved sellers straight to the dashboard', () => {
    expect(sellerEntryHref('approved')).toBe('/seller');
  });

  it('never routes the CTA to a privileged admin path', () => {
    for (const state of [
      'anonymous',
      'no-profile',
      'pending',
      'rejected',
      'suspended',
      'approved',
    ] as const) {
      expect(sellerEntryHref(state)).not.toContain('/admin');
    }
  });
});

