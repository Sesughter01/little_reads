import { describe, it, expect } from 'vitest';
import {
  AUTH_INTENT_LABELS,
  AUTH_INTENT_STORAGE_KEY,
  isPaymentRecoveryPath,
  parseAuthIntent,
  resolvePostAuthDestination,
  sellerIntentHref,
} from '@/lib/auth-intent';
import { canBuyProduct, sellerEntryHref } from '@/lib/seller-routing';

/**
 * Auth INTENT is a navigation hint, never authorization.
 *
 * Registration and Login share ONE page each; the Buy Books / Sell Books
 * choice only decides where the user lands afterwards. These tests pin the
 * security property: nothing the client can supply (query param, stored hint,
 * hand-edited value) can produce an approved-seller destination — only the
 * server-derived seller state can.
 */

describe('parseAuthIntent (only an explicit "sell" selects seller intent)', () => {
  it('accepts the exact "sell" value', () => {
    expect(parseAuthIntent('sell')).toBe('sell');
  });

  it('defaults to buy for everything else, including forged privileged values', () => {
    const forgeries: (string | null | undefined)[] = [
      null,
      undefined,
      '',
      'buy',
      'SELL',
      'Sell',
      ' approved ',
      'approved',
      'admin',
      'seller',
      'sell;approved',
      '1',
      'true',
    ];
    for (const raw of forgeries) {
      expect(parseAuthIntent(raw)).toBe('buy');
    }
  });

  it('exposes human labels for both intents', () => {
    expect(AUTH_INTENT_LABELS.buy).toBe('Buy Books');
    expect(AUTH_INTENT_LABELS.sell).toBe('Sell Books');
  });

  it('uses a per-tab temporary storage key (not a role-bearing cookie)', () => {
    expect(AUTH_INTENT_STORAGE_KEY).toBe('littlereads_auth_intent');
  });
});

describe('sellerIntentHref (routing derived from AUTHORITATIVE server state)', () => {
  it('approved seller → /seller', () => {
    expect(sellerIntentHref('approved')).toBe('/seller');
  });

  it('pending application → /seller/pending', () => {
    expect(sellerIntentHref('pending')).toBe('/seller/pending');
  });

  it('no application → /seller/onboarding', () => {
    expect(sellerIntentHref('no-profile')).toBe('/seller/onboarding');
  });

  it('rejected / suspended → /seller/status', () => {
    expect(sellerIntentHref('rejected')).toBe('/seller/status');
    expect(sellerIntentHref('suspended')).toBe('/seller/status');
  });

  it('a missing/failed state read degrades to the safe unguarded page', () => {
    // /seller/onboarding is safe to fail closed to: it is public, it re-checks
    // the session server-side, and a submitted application is always pending.
    expect(sellerIntentHref(null)).toBe('/seller/onboarding');
    expect(sellerIntentHref(undefined)).toBe('/seller/onboarding');
    expect(sellerIntentHref('anonymous')).toBe('/seller/onboarding');
  });

  it('SELLER intent alone can never reach an approved-seller destination', () => {
    // The ONLY input that yields /seller is the server-derived 'approved'
    // state. Rooting /seller server-side (requireApprovedSeller) then rejects
    // any client that acts on a stale or spoofed hint.
    const states = ['anonymous', 'no-profile', 'pending', 'rejected', 'suspended'] as const;
    for (const state of states) {
      expect(sellerIntentHref(state)).not.toBe('/seller');
    }
  });
});

describe('resolvePostAuthDestination — CUSTOMER (buy) intent', () => {
  it('falls back to /account by default', () => {
    expect(resolvePostAuthDestination({ intent: 'buy' })).toBe('/account');
  });

  it('honours a validated ?redirect= destination', () => {
    expect(resolvePostAuthDestination({ intent: 'buy', redirect: '/checkout' })).toBe(
      '/checkout'
    );
  });

  it('keeps checkout recovery deep links intact (query string preserved)', () => {
    expect(
      resolvePostAuthDestination({ intent: 'buy', redirect: '/checkout/success?ref=LR-123' })
    ).toBe('/checkout/success?ref=LR-123');
  });

  it('falls back to /account on unsafe redirect candidates', () => {
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
      expect(resolvePostAuthDestination({ intent: 'buy', redirect: bad })).toBe('/account');
    }
  });

  it('honours a validated custom fallback (e.g. a post-verification target)', () => {
    expect(resolvePostAuthDestination({ intent: 'buy', fallback: '/account/orders' })).toBe(
      '/account/orders'
    );
  });
});

describe('resolvePostAuthDestination — SELLER (sell) intent', () => {
  it('approved seller → /seller', () => {
    expect(resolvePostAuthDestination({ intent: 'sell', sellerState: 'approved' })).toBe('/seller');
  });

  it('pending seller → /seller/pending', () => {
    expect(resolvePostAuthDestination({ intent: 'sell', sellerState: 'pending' })).toBe(
      '/seller/pending'
    );
  });

  it('no seller application → /seller/onboarding', () => {
    expect(resolvePostAuthDestination({ intent: 'sell', sellerState: 'no-profile' })).toBe(
      '/seller/onboarding'
    );
  });

  it('routes by the SERVER state, not by the intent or the redirect param', () => {
    // A seller-intent visitor who is only pending must never be sent to
    // /seller just because they asked to sell, and a ?redirect=/seller
    // candidate is ignored (ignoring a non-payment redirect is the safer
    // failure mode for deeper links).
    expect(
      resolvePostAuthDestination({ intent: 'sell', redirect: '/seller', sellerState: 'pending' })
    ).toBe('/seller/pending');

    expect(
      resolvePostAuthDestination({ intent: 'sell', redirect: '/seller', sellerState: 'no-profile' })
    ).toBe('/seller/onboarding');
  });

  it('payment-recovery redirects still win (never strand a paid order)', () => {
    expect(
      resolvePostAuthDestination({
        intent: 'sell',
        redirect: '/checkout/success?ref=LR-999',
        sellerState: 'approved',
      })
    ).toBe('/checkout/success?ref=LR-999');
  });

  it('an unknown/missing server state degrades to the safe unguarded page', () => {
    expect(resolvePostAuthDestination({ intent: 'sell', sellerState: null })).toBe(
      '/seller/onboarding'
    );
  });

  it('rejects unsafe redirect candidates for seller intent too', () => {
    expect(
      resolvePostAuthDestination({
        intent: 'sell',
        redirect: '//evil.example',
        sellerState: 'approved',
      })
    ).toBe('/seller');
  });
  it('rejected / suspended → /seller/status', () => {
    expect(resolvePostAuthDestination({ intent: 'sell', sellerState: 'rejected' })).toBe(
      '/seller/status'
    );
    expect(resolvePostAuthDestination({ intent: 'sell', sellerState: 'suspended' })).toBe(
      '/seller/status'
    );
  });

  it('a forged ?redirect=/seller cannot promote a non-approved applicant', () => {
    expect(
      resolvePostAuthDestination({ intent: 'sell', redirect: '/seller', sellerState: 'rejected' })
    ).toBe('/seller/status');
    expect(
      resolvePostAuthDestination({ intent: 'sell', redirect: '/seller', sellerState: 'pending' })
    ).toBe('/seller/pending');
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
});

describe('safe redirect handling stays intact (no open redirect / redirect loop)', () => {
  it('never returns /login or /register for any intent + candidate', () => {
    // Returning an auth page would recreate the loop the guard exists to stop.
    const candidates: (string | null)[] = [
      '/login',
      '/register',
      '//evil.example',
      'https://evil.example',
      '/account',
      null,
    ];
    for (const intent of ['buy', 'sell'] as const) {
      for (const redirect of candidates) {
        const href = resolvePostAuthDestination({ intent, redirect, sellerState: 'approved' });
        expect(href).not.toBe('/login');
        expect(href).not.toBe('/register');
      }
    }
  });

  it('a malformed percent-encoded candidate is rejected, not navigated raw', () => {
    expect(
      resolvePostAuthDestination({ intent: 'buy', redirect: '%E0%A4%A' })
    ).toBe('/account');
  });

  it('a percent-encoded protocol-relative candidate is rejected', () => {
    expect(
      resolvePostAuthDestination({ intent: 'buy', redirect: '%2F%2Fevil.example' })
    ).toBe('/account');
  });

  it('rejects an over-long candidate (junk is not a destination)', () => {
    const huge = '/account?' + 'a'.repeat(600);
    expect(resolvePostAuthDestination({ intent: 'buy', redirect: huge })).toBe('/account');
  });

  it('mid-flow only pages are never returned post-authentication', () => {
    for (const midFlow of ['/forgot-password', '/reset-password']) {
      expect(resolvePostAuthDestination({ intent: 'buy', redirect: midFlow })).toBe('/account');
      expect(resolvePostAuthDestination({ intent: 'sell', redirect: midFlow })).toBe(
        '/seller/onboarding'
      );
    }
  });
describe('security invariants across the intent selector', () => {
  it('the selector never grants a role and never routes to admin', () => {
    const states = [
      'anonymous',
      'no-profile',
      'pending',
      'rejected',
      'suspended',
      'approved',
      null,
    ] as const;
    for (const intent of ['buy', 'sell'] as const) {
      for (const sellerState of states) {
        const href = resolvePostAuthDestination({ intent, sellerState });
        expect(href.startsWith('/')).toBe(true); // internal path only
        expect(href.startsWith('//')).toBe(false); // never protocol-relative
        expect(href).not.toContain('/admin');
      }
    }
  });

  it('seller intent does not change whether a seller may buy their own book', () => {
    // Buying rules stay a pure, server-mirrored predicate: intent is irrelevant.
    expect(canBuyProduct('seller-a', 'seller-a')).toBe(false);
    expect(canBuyProduct('seller-a', 'seller-b')).toBe(true);
    expect(canBuyProduct('seller-a', null)).toBe(true);
  });

  it('anonymous sellers are still invited through the ONE register page', () => {
    expect(sellerEntryHref('anonymous')).toBe('/register?sell=1');
    expect(sellerEntryHref('anonymous')).not.toContain('/seller/register');
  });

  it('no separate seller authentication routes are ever referenced', () => {
    const states = ['anonymous', 'no-profile', 'pending', 'rejected', 'suspended', 'approved'] as const;
    for (const state of states) {
      expect(sellerEntryHref(state)).not.toContain('/seller/login');
      expect(sellerEntryHref(state)).not.toContain('/seller/register');
      expect(sellerIntentHref(state)).not.toContain('/seller/login');
      expect(sellerIntentHref(state)).not.toContain('/seller/register');
    }
  });
});
});

describe('security invariants across the intent selector', () => {
  it('the selector never grants a role and never routes to admin', () => {
    const states = [
      'anonymous',
      'no-profile',
      'pending',
      'rejected',
      'suspended',
      'approved',
      null,
    ] as const;
    for (const intent of ['buy', 'sell'] as const) {
      for (const state of states) {
        const href = resolvePostAuthDestination({ intent, sellerState: state });
        expect(href.startsWith('/')).toBe(true); // internal path only
        expect(href.startsWith('//')).toBe(false); // never protocol-relative
        expect(href).not.toContain('/admin');
      }
    }
  });

  it('seller intent does not change whether a seller may buy their own book', () => {
    // Buying rules stay a pure server-mirrored predicate: intent is irrelevant.
    expect(canBuyProduct('seller-a', 'seller-a')).toBe(false);
    expect(canBuyProduct('seller-a', 'seller-b')).toBe(true);
    expect(canBuyProduct('seller-a', null)).toBe(true);
  });

  it('anonymous sellers are invited through the ONE register page', () => {
    expect(sellerEntryHref('anonymous')).toBe('/register?sell=1');
    expect(sellerEntryHref('anonymous')).not.toContain('/seller/register');
  });

  it('no separate seller authentication routes are referenced anywhere', () => {
    expect(sellerEntryHref('anonymous')).not.toContain('/seller/login');
    expect(sellerIntentHref('no-profile')).not.toContain('/seller/login');
    expect(sellerIntentHref('no-profile')).not.toContain('/seller/register');
  });
});