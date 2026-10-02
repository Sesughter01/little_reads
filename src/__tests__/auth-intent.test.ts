import { describe, it, expect } from 'vitest';
import { isPaymentRecoveryPath, resolvePostAuthDestination } from '@/lib/auth-intent';
import { canBuyProduct, sellerEntryHref } from '@/lib/seller-routing';

/**
 * LittleReads has ONE customer authentication flow.
 *
 * The Buy Books / Sell Books "intent" system is gone. These tests pin the two
 * surviving properties:
 *
 *   1. A customer sign-in / registration lands on a VALIDATED destination
 *      (the explicit ?redirect=/?next=, else the pending destination carried
 *      through email verification, else /account) — including checkout
 *      recovery links.
 *   2. "Become an Author" is a SEPARATE journey whose anonymous entry point is
 *      /seller/onboarding — never the customer register page with ?sell=1, and
 *      never a /seller/login or /seller/register route.
 */

describe('resolvePostAuthDestination (customer flow only)', () => {
  it('falls back to /account by default', () => {
    expect(resolvePostAuthDestination({})).toBe('/account');
  });

  it('honours a validated ?redirect= destination', () => {
    expect(resolvePostAuthDestination({ redirect: '/account/orders' })).toBe(
      '/account/orders'
    );
  });

  it('honours the pending destination carried through email verification', () => {
    expect(resolvePostAuthDestination({ pending: '/account/library' })).toBe(
      '/account/library'
    );
  });

  it('prefers the explicit ?redirect= over the pending destination', () => {
    expect(
      resolvePostAuthDestination({ redirect: '/checkout', pending: '/account/library' })
    ).toBe('/checkout');
  });

  it('falls through an invalid redirect to the pending destination', () => {
    expect(
      resolvePostAuthDestination({
        redirect: 'https://evil.example',
        pending: '/account/library',
      })
    ).toBe('/account/library');
  });

  it('honours a validated custom fallback (e.g. a post-verification target)', () => {
    expect(resolvePostAuthDestination({ fallback: '/account/orders' })).toBe(
      '/account/orders'
    );
  });

  it('keeps checkout recovery deep links intact (query string preserved)', () => {
    expect(resolvePostAuthDestination({ redirect: '/checkout/success?ref=LR-123' })).toBe(
      '/checkout/success?ref=LR-123'
    );
  });

  it('falls back on unsafe redirect candidates', () => {
    const unsafe = [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      '/login',
      '/register',
      '/../admin',
    ];
    for (const bad of unsafe) {
      expect(resolvePostAuthDestination({ redirect: bad })).toBe('/account');
    }
  });

  it('rejects malformed / percent-encoded / over-long candidates', () => {
    expect(resolvePostAuthDestination({ redirect: '%E0%A4%A' })).toBe('/account');
    expect(resolvePostAuthDestination({ redirect: '%2F%2Fevil.example' })).toBe('/account');
    expect(resolvePostAuthDestination({ redirect: '/account?' + 'a'.repeat(600) })).toBe(
      '/account'
    );
  });

  it('never returns an auth or mid-flow page (no redirect loop)', () => {
    for (const candidate of [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
    ]) {
      const href = resolvePostAuthDestination({ redirect: candidate });
      expect(href).not.toBe('/login');
      expect(href).not.toBe('/register');
      expect(href).not.toBe('/forgot-password');
      expect(href).not.toBe('/reset-password');
    }
  });
});

describe('isPaymentRecoveryPath', () => {
  it('matches the checkout flow and its return pages only', () => {
    expect(isPaymentRecoveryPath('/checkout')).toBe(true);
    expect(isPaymentRecoveryPath('/checkout/success?ref=LR-1')).toBe(true);
    expect(isPaymentRecoveryPath('/checkout/failed')).toBe(true);
    expect(isPaymentRecoveryPath('/CHECKOUT/success')).toBe(true);
    expect(isPaymentRecoveryPath('/checkout#receipt')).toBe(true);
    expect(isPaymentRecoveryPath('/account')).toBe(false);
    expect(isPaymentRecoveryPath('/checkouts')).toBe(false);
    expect(isPaymentRecoveryPath('/seller')).toBe(false);
    expect(isPaymentRecoveryPath('/')).toBe(false);
    expect(isPaymentRecoveryPath('')).toBe(false);
  });

  it('checkout recovery links are always a valid post-auth destination', () => {
    for (const path of ['/checkout', '/checkout/success?ref=LR-9', '/checkout/failed']) {
      expect(isPaymentRecoveryPath(path)).toBe(true);
      expect(resolvePostAuthDestination({ redirect: path })).toBe(path);
    }
  });
});

describe('the Buy/Sell intent system has been removed', () => {
  it('auth-intent no longer exports any intent or seller-routing helper', async () => {
    const mod = await import('@/lib/auth-intent');
    const removed = [
      'AuthIntent',
      'AUTH_INTENT_LABELS',
      'AUTH_INTENT_STORAGE_KEY',
      'parseAuthIntent',
      'sellFlagToIntent',
      'readStoredAuthIntent',
      'storeAuthIntent',
      'clearStoredAuthIntent',
      'sellerIntentHref',
    ];
    for (const name of removed) {
      expect(name in mod).toBe(false);
    }
  });
});

describe('sellerEntryHref ("Become an Author" entry-point routing)', () => {
  it('sends anonymous visitors straight to the author application entry point', () => {
    expect(sellerEntryHref('anonymous')).toBe('/seller/onboarding');
  });

  it('never detours through the customer register page with ?sell=1', () => {
    expect(sellerEntryHref('anonymous')).not.toContain('/register');
    expect(sellerEntryHref('anonymous')).not.toContain('sell=1');
  });

  it('routes authenticated users without a profile to onboarding', () => {
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

  it('never routes to a separate seller auth route or a privileged admin path', () => {
    for (const state of [
      'anonymous',
      'no-profile',
      'pending',
      'rejected',
      'suspended',
      'approved',
    ] as const) {
      const href = sellerEntryHref(state);
      expect(href).not.toContain('/seller/login');
      expect(href).not.toContain('/seller/register');
      expect(href).not.toContain('/admin');
      expect(href.startsWith('/')).toBe(true);
      expect(href.startsWith('//')).toBe(false);
    }
  });
});

describe('sellers cannot buy their own books (unchanged by the auth UX)', () => {
  it('is a pure, server-mirrored predicate', () => {
    expect(canBuyProduct('seller-a', 'seller-a')).toBe(false);
    expect(canBuyProduct('seller-a', 'seller-b')).toBe(true);
    expect(canBuyProduct('seller-a', null)).toBe(true);
    expect(canBuyProduct(null, 'seller-a')).toBe(true);
  });
});
