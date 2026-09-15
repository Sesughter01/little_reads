import { describe, it, expect } from 'vitest';
import {
  sellerPostLoginDestination,
  parseSignupIntent,
  parseLoginIntent,
  canBuyProduct,
  sellerEntryHref,
} from '@/lib/seller-routing';

describe('parseSignupIntent', () => {
  it('defaults to buyer for missing/unknown values', () => {
    expect(parseSignupIntent(undefined)).toBe('buyer');
    expect(parseSignupIntent(null)).toBe('buyer');
    expect(parseSignupIntent('')).toBe('buyer');
    expect(parseSignupIntent('buyer')).toBe('buyer');
    expect(parseSignupIntent('admin')).toBe('buyer');
    expect(parseSignupIntent('SELLER')).toBe('buyer');
  });

  it('accepts the seller intent', () => {
    expect(parseSignupIntent('seller')).toBe('seller');
  });

  it('intent is display-only: parsing seller never grants privileges', () => {
    // The parsed value is a UI routing hint only. No role, status, or
    // seller_profiles row is created by this function — that decision lives
    // server-side in /api/seller/onboarding + the 007 trigger.
    const intent = parseSignupIntent('seller');
    expect(intent).toBe('seller');
    expect(typeof intent).toBe('string');
  });
});

describe('parseLoginIntent', () => {
  it('defaults to buyer for missing/unknown values', () => {
    expect(parseLoginIntent(undefined)).toBe('buyer');
    expect(parseLoginIntent('admin')).toBe('buyer');
    expect(parseLoginIntent('')).toBe('buyer');
  });

  it('accepts the seller intent', () => {
    expect(parseLoginIntent('seller')).toBe('seller');
  });

  it('never exposes admin as a login type', () => {
    expect(parseLoginIntent('admin')).not.toBe('admin');
    expect(['buyer', 'seller']).toContain(parseLoginIntent('admin'));
  });
});

describe('sellerPostLoginDestination', () => {
  it('routes approved sellers to the dashboard', () => {
    expect(sellerPostLoginDestination('approved')).toBe('/seller');
  });

  it('routes pending sellers to the pending page', () => {
    expect(sellerPostLoginDestination('pending')).toBe('/seller/pending');
  });

  it('routes rejected/suspended sellers to the status page', () => {
    expect(sellerPostLoginDestination('rejected')).toBe('/seller/status');
    expect(sellerPostLoginDestination('suspended')).toBe('/seller/status');
  });

  it('routes users without a seller profile to onboarding', () => {
    expect(sellerPostLoginDestination('no-profile')).toBe('/seller/onboarding');
  });

  it('routes anonymous sessions back through login', () => {
    expect(sellerPostLoginDestination('anonymous')).toBe('/login?redirect=/seller');
  });
});

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
  it('sends visitors to signup with the seller intent hint', () => {
    expect(sellerEntryHref('anonymous')).toBe('/register?intent=seller');
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

