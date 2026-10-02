import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * AUTH UX REFACTOR — source contracts.
 *
 * LittleReads has ONE plain customer auth flow (/register, /login) and a
 * SEPARATE author application journey starting at /seller/onboarding. These
 * tests read the actual source so a future edit cannot quietly reintroduce the
 * Buy/Sell selector, the ?sell=1 detour, or a hard-coded /register CTA in the
 * navigation.
 *
 * Behavioural coverage for seller authorization lives in
 * seller-onboarding.test.ts / admin-seller-api.test.ts / checkout-security.test.ts.
 */

const read = (relative: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf-8');

const AUTH_INTENT_TOKENS = [
  'AuthIntentSelector',
  'intent-selector',
  'sellFlagToIntent',
  'storeAuthIntent',
  'clearStoredAuthIntent',
  'readStoredAuthIntent',
  'parseAuthIntent',
  'sellerIntentHref',
  'Buy Books',
  'Sell Books',
  '?sell=1',
];

describe('/register is a plain customer registration flow', () => {
  it('has no Buy/Sell selector or seller-intent wiring', () => {
    const source = read('app/(auth)/register/register-client.tsx');
    for (const token of AUTH_INTENT_TOKENS) {
      expect(source).not.toContain(token);
    }
  });

  it('still registers a normal customer account (signUp + verify-email path)', () => {
    const source = read('app/(auth)/register/register-client.tsx');
    expect(source).toContain('auth.signUp');
    expect(source).toContain('littlereads_pending_email');
    expect(source).toContain('/verify-email');
    expect(source).toContain("first_name: firstName");
  });

  it('the page component passes no intent prop', () => {
    const source = read('app/(auth)/register/page.tsx');
    expect(source).not.toContain('initialIntent');
    expect(source).not.toContain('sellFlagToIntent');
    expect(source).toContain('<RegisterClient />');
  });
});

describe('/login is a plain customer login flow', () => {
  it('has no Buy/Sell selector or seller-intent wiring', () => {
    const source = read('app/(auth)/login/login-client.tsx');
    for (const token of AUTH_INTENT_TOKENS) {
      expect(source).not.toContain(token);
    }
  });

  it('still signs a normal customer in (password sign-in + /account default)', () => {
    const source = read('app/(auth)/login/login-client.tsx');
    expect(source).toContain('signInWithPassword');
    expect(source).toContain("fallback: '/account'");
  });

  it('the page component passes no intent prop', () => {
    const source = read('app/(auth)/login/page.tsx');
    expect(source).not.toContain('initialIntent');
    expect(source).not.toContain('sellFlagToIntent');
    expect(source).toContain('<LoginClient />');
  });
});

describe('the obsolete auth-intent machinery is gone', () => {
  it('the Buy/Sell selector component no longer exists', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../components/auth/intent-selector.tsx'))).toBe(
      false
    );
    expect(
      fs.existsSync(path.resolve(__dirname, '../components/auth/auth-intent-selector.tsx'))
    ).toBe(false);
  });

  it('auth-intent.ts no longer mentions intents or seller routing', () => {
    const source = read('lib/auth-intent.ts');
    expect(source).not.toContain('AuthIntent');
    expect(source).not.toContain('sellFlagToIntent');
    expect(source).not.toContain("'sell'");
    expect(source).toContain('resolvePostAuthDestination');
    expect(source).toContain('isPaymentRecoveryPath');
  });

  it('no separate /seller/login or /seller/register route exists', () => {
    for (const route of [
      'app/(public)/seller/login',
      'app/(public)/seller/register',
      'app/seller/login',
      'app/seller/register',
    ]) {
      expect(fs.existsSync(path.resolve(__dirname, '..', route))).toBe(false);
    }
  });
});

describe('anonymous author CTAs route to /seller/onboarding', () => {
  it('navbar desktop CTA uses the shared author href and is visible at lg+', () => {
    const source = read('components/layout/header.tsx');
    expect(source).toContain('href={sellerHref}');
    expect(source).toContain('{sellerLabel}');
    // Not gated to xl — "Become an Author" must remain visible at normal
    // desktop widths.
    expect(source).not.toContain('hidden xl:inline-flex');
  });

  it('mobile drawer author link uses the shared href (no hard-coded /register)', () => {
    const source = read('components/layout/header.tsx');
    const authorLinks = source.match(/href=\{sellerHref\}/g) || [];
    expect(authorLinks.length).toBeGreaterThanOrEqual(2); // desktop + mobile drawer
    expect(source).not.toContain('href="/register?sell=1"');
  });

  it('announcement bar CTA uses the shared author href', () => {
    const source = read('components/layout/announcement-bar.tsx');
    expect(source).toContain('useSellerEntry');
    expect(source).toContain('href={href}');
    expect(source).not.toContain('/register');
  });

  it('account dashboard CTA is derived server-side from seller state', () => {
    const source = read('app/(dashboard)/account/page.tsx');
    expect(source).toContain('sellerEntryHref');
    expect(source).toContain('getSellerAccess');
  });
});

describe('/seller/onboarding is the author application entry point', () => {
  it('explains that an account/sign-in is required and returns there after auth', () => {
    const source = read('app/(public)/seller/onboarding/page.tsx');
    expect(source).toContain('You need a LittleReads account');
    expect(source).toContain('/login?redirect=/seller/onboarding');
    expect(source).toContain('/register?redirect=/seller/onboarding');
    expect(source).toContain("fetch('/api/seller/onboarding'");
  });

  it('distinguishes confirmed-anonymous from still-loading', () => {
    const source = read('app/(public)/seller/onboarding/page.tsx');
    expect(source).toContain('ready');
  });
});

describe('seller approval stays server/database controlled', () => {
  it('the onboarding API forces status=pending and never reads privileged fields from the body', () => {
    const source = read('app/api/seller/onboarding/route.ts');
    expect(source).toContain("status: 'pending' as const");
    for (const field of ['input.status', 'input.approved_by', 'input.approved_at', 'input.user_id']) {
      expect(source).not.toContain(field);
    }
  });
});
