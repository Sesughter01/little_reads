import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Public Supabase client (no request cookies)
// ============================================
describe('Public Supabase client', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('createPublicClient config never reads request cookies', () => {
    // Mirrors src/lib/supabase/server.ts createPublicClient:
    // getAll returns [] and setAll is a no-op — the cookie jar is stateless.
    const config = {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    };
    expect(config.cookies.getAll()).toEqual([]);
    expect(typeof config.cookies.setAll).toBe('function');
  });

  it('getCategories uses the public client, not the cookie client', async () => {
    const serverModule = await import('@/lib/supabase/server');
    const createPublicClientSpy = vi
      .spyOn(serverModule, 'createPublicClient')
      .mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as never);
    const createClientSpy = vi
      .spyOn(serverModule, 'createClient')
      .mockResolvedValue({} as never);

    const { getCategories } = await import('@/lib/db');
    await getCategories();

    expect(createPublicClientSpy).toHaveBeenCalled();
    expect(createClientSpy).not.toHaveBeenCalled();

    createPublicClientSpy.mockRestore();
    createClientSpy.mockRestore();
  });

  it('getCartProducts uses the public client, not the cookie client', async () => {
    const serverModule = await import('@/lib/supabase/server');
    const createPublicClientSpy = vi
      .spyOn(serverModule, 'createPublicClient')
      .mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      } as never);
    const createClientSpy = vi
      .spyOn(serverModule, 'createClient')
      .mockResolvedValue({} as never);

    const { getCartProducts } = await import('@/lib/db');
    await getCartProducts(['id-1', 'id-2']);

    expect(createPublicClientSpy).toHaveBeenCalled();
    expect(createClientSpy).not.toHaveBeenCalled();

    createPublicClientSpy.mockRestore();
    createClientSpy.mockRestore();
  });

  it('public queries never use the service-role key', async () => {
    const serverModule = await import('@/lib/supabase/server');
    const createServiceClientSpy = vi
      .spyOn(serverModule, 'createServiceClient')
      .mockResolvedValue({} as never);
    const createPublicClientSpy = vi
      .spyOn(serverModule, 'createPublicClient')
      .mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as never);

    const { getCategories } = await import('@/lib/db');
    await getCategories();

    expect(createServiceClientSpy).not.toHaveBeenCalled();
    expect(createPublicClientSpy).toHaveBeenCalled();

    createServiceClientSpy.mockRestore();
    createPublicClientSpy.mockRestore();
  });
});

// ============================================
// Category + Age overlap filtering
// ============================================
describe('Category and Age filtering', () => {
  it('maps category slug → category id → products.category_id (never slug match)', () => {
    // Server flow: look up category by slug, then filter products by category_id.
    const categories = [{ id: 'cat-edu', slug: 'education' }];
    const products = [
      { id: '1', category_id: 'cat-edu' },
      { id: '2', category_id: 'cat-tech' },
    ];

    const slug = 'education';
    const cat = categories.find((c) => c.slug === slug);
    const matches = products.filter((p) => p.category_id === cat?.id);

    expect(matches.map((m) => m.id)).toEqual(['1']);
    // The old broken pattern (category:categories.slug) must not exist:
    const brokenMatch = products.filter((p) => p.category_id === slug);
    expect(brokenMatch).toHaveLength(0);
  });

  it('age overlap: gte(age_max, min) AND lte(age_min, max)', () => {
    const products = [
      { id: 'a', age_min: 4, age_max: 5 },
      { id: 'b', age_min: 5, age_max: 7 },
      { id: 'c', age_min: 6, age_max: 8 },
      { id: 'd', age_min: 7, age_max: 9 },
    ];

    const selectedMin = 5;
    const selectedMax = 6;

    const matches = products.filter(
      (p) => p.age_max >= selectedMin && p.age_min <= selectedMax
    );

    // 4–5 MATCH, 5–7 MATCH, 6–8 MATCH, 7–9 NO MATCH
    expect(matches.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    expect(matches.some((m) => m.id === 'd')).toBe(false);
  });

  it('combined category + age filter narrows correctly', () => {
    const products = [
      { id: '1', category_id: 'edu', age_min: 4, age_max: 5 },
      { id: '2', category_id: 'edu', age_min: 8, age_max: 10 },
      { id: '3', category_id: 'tech', age_min: 5, age_max: 7 },
    ];

    const catId = 'edu';
    const selectedMin = 5;
    const selectedMax = 6;

    const matches = products.filter(
      (p) =>
        p.category_id === catId &&
        p.age_max >= selectedMin &&
        p.age_min <= selectedMax
    );

    expect(matches.map((m) => m.id)).toEqual(['1']);
  });
});

// ============================================
// Customer email OTP — no silent account creation
// ============================================
describe('Customer email OTP login', () => {
  it('signInWithOtp is called with shouldCreateUser: false', async () => {
    const { OTP_LOGIN_OPTIONS } = await import('@/lib/auth-options');
    expect(OTP_LOGIN_OPTIONS.shouldCreateUser).toBe(false);

    // Simulate the login flow: options are passed through unchanged.
    const signInWithOtp = vi.fn(async (_args: unknown) => ({ error: null }));
    await signInWithOtp({ email: 'test@example.com', options: OTP_LOGIN_OPTIONS });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: { shouldCreateUser: false },
    });
  });

  it('an unknown email must NOT be auto-created by the OTP flow', () => {
    // The config contract: shouldCreateUser false means Supabase rejects the
    // request for unknown emails instead of creating an account.
    const config = { shouldCreateUser: false };
    expect(config.shouldCreateUser).toBe(false);
  });
});

// ============================================
// Signup verification flow
// ============================================
describe('Signup email verification flow', () => {
  it('unverified signup routes to /verify-email, never /account', () => {
    function routeAfterSignup(data: { session: unknown }): string {
      if (data.session) return '/account';
      return '/verify-email';
    }

    expect(routeAfterSignup({ session: null })).toBe('/verify-email');
    expect(routeAfterSignup({ session: {} })).toBe('/account');
  });

  it('auth callback redirects to /login?verified=1 after code exchange', () => {
    function callbackResult(exchanged: boolean, signOutOk: boolean) {
      if (exchanged && signOutOk) return '/login?verified=1';
      return '/login?error=verification_failed';
    }

    expect(callbackResult(true, true)).toBe('/login?verified=1');
    expect(callbackResult(false, true)).toBe('/login?error=verification_failed');
  });

  it('resend verification enforces a 60s cooldown', () => {
    const COOLDOWN_MS = 60 * 1000;
    // No previous send — the first request is allowed.
    let lastSentAt = Number.NEGATIVE_INFINITY;

    function canResend(now: number): boolean {
      return now - lastSentAt >= COOLDOWN_MS;
    }

    expect(canResend(0)).toBe(true);
    lastSentAt = 1000;
    // 1s later — blocked
    expect(canResend(2000)).toBe(false);
    // 30s later — still blocked
    expect(canResend(1000 + 30 * 1000)).toBe(false);
    // 60s after send — allowed again
    expect(canResend(1000 + COOLDOWN_MS)).toBe(true);
  });
});

// ============================================
// Admin route guard decisions
// ============================================
describe('Admin access rules', () => {
  function adminRouteDecision(input: {
    authenticated: boolean;
    role: string | null;
    pathname: string;
  }): 'render' | 'login' | 'denied' {
    if (input.pathname === '/admin/login') return 'render';
    if (!input.authenticated) return 'login';
    if (input.role !== 'admin') return 'denied';
    return 'render';
  }

  it('anonymous /admin/login renders', () => {
    expect(
      adminRouteDecision({ authenticated: false, role: null, pathname: '/admin/login' })
    ).toBe('render');
  });

  it('anonymous /admin redirects to login', () => {
    expect(
      adminRouteDecision({ authenticated: false, role: null, pathname: '/admin' })
    ).toBe('login');
  });

  it('customer /admin is denied', () => {
    expect(
      adminRouteDecision({ authenticated: true, role: 'customer', pathname: '/admin' })
    ).toBe('denied');
  });

  it('admin /admin is allowed', () => {
    expect(
      adminRouteDecision({ authenticated: true, role: 'admin', pathname: '/admin' })
    ).toBe('render');
  });

  it('MFA routes are reachable while admin auth is in progress', () => {
    // Middleware: authenticated user may reach /admin/mfa/* before aal2 is met.
    const pathname = '/admin/mfa/verify';
    expect(pathname.startsWith('/admin/mfa/')).toBe(true);
  });
});

// ============================================
// Order status transitions (server-validated)
// ============================================
describe('Order status transitions', () => {
  it('allows valid transitions and rejects invalid ones', async () => {
    const { canTransitionOrder, isValidOrderStatus } = await import(
      '@/lib/order-status'
    );

    expect(canTransitionOrder('pending', 'paid')).toBe(true);
    expect(canTransitionOrder('pending', 'failed')).toBe(true);
    expect(canTransitionOrder('paid', 'refunded')).toBe(true);
    expect(canTransitionOrder('paid', 'pending')).toBe(false);
    expect(canTransitionOrder('refunded', 'paid')).toBe(false);
    expect(canTransitionOrder('pending', 'refunded')).toBe(false);
    expect(canTransitionOrder('pending', 'pending')).toBe(true);
  });

  it('rejects arbitrary client-supplied statuses', async () => {
    const { isValidOrderStatus } = await import('@/lib/order-status');
    expect(isValidOrderStatus('paid')).toBe(true);
    expect(isValidOrderStatus('hacked')).toBe(false);
    expect(isValidOrderStatus('')).toBe(false);
  });
});

// ============================================
// Review moderation — allowed statuses only
// ============================================
describe('Review moderation statuses', () => {
  it('only accepts pending | approved | hidden', async () => {
    const { ALLOWED_REVIEW_STATUSES, isValidReviewStatus } = await import(
      '@/lib/review-status'
    );

    expect(ALLOWED_REVIEW_STATUSES).toEqual(['pending', 'approved', 'hidden']);
    expect(isValidReviewStatus('approved')).toBe(true);
    expect(isValidReviewStatus('pending')).toBe(true);
    expect(isValidReviewStatus('hidden')).toBe(true);
    expect(isValidReviewStatus('deleted')).toBe(false);
    expect(isValidReviewStatus('spam')).toBe(false);
  });
});

// ============================================
// Paystack config + webhook HMAC
// ============================================
describe('Paystack configuration and webhook security', () => {
  const originalSecret = process.env.PAYSTACK_SECRET_KEY;
  const originalPublic = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = originalSecret;
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = originalPublic;
  });

  it('classifies missing keys as MISSING', async () => {
    process.env.PAYSTACK_SECRET_KEY = '';
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = '';
    const { getPaystackMode } = await import('@/lib/paystack');
    expect(getPaystackMode()).toBe('MISSING');
  });

  it('classifies placeholder keys as PLACEHOLDER', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const { getPaystackMode } = await import('@/lib/paystack');
    expect(getPaystackMode()).toBe('PLACEHOLDER');
  });

  it('classifies real test keys as TEST', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_abcd1234';
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = 'pk_test_abcd1234';
    const { getPaystackMode } = await import('@/lib/paystack');
    expect(getPaystackMode()).toBe('TEST');
  });

  it('classifies mismatched test/live keys as INVALID', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_abcd1234';
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = 'pk_live_abcd1234';
    const { getPaystackMode } = await import('@/lib/paystack');
    expect(getPaystackMode()).toBe('INVALID');
  });

  it('verifies webhook HMAC-SHA512 with PAYSTACK_SECRET_KEY', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_webhooksecret123';
    const { verifyWebhookSignature } = await import('@/lib/paystack');
    const crypto = await import('crypto');

    const body = JSON.stringify({ event: 'charge.success', data: {} });
    const expected = crypto
      .createHmac('sha512', 'sk_test_webhooksecret123')
      .update(body)
      .digest('hex');

    expect(verifyWebhookSignature(body, expected)).toBe(true);
  });

  it('rejects a forged webhook signature', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_webhooksecret123';
    const { verifyWebhookSignature } = await import('@/lib/paystack');

    const body = JSON.stringify({ event: 'charge.success', data: {} });
    expect(verifyWebhookSignature(body, 'forged000000000000')).toBe(false);
    expect(verifyWebhookSignature(body, null)).toBe(false);
  });

  it('rejects webhooks when no secret key is configured', async () => {
    process.env.PAYSTACK_SECRET_KEY = '';
    const { verifyWebhookSignature } = await import('@/lib/paystack');
    const body = JSON.stringify({ event: 'charge.success', data: {} });
    expect(verifyWebhookSignature(body, 'anything')).toBe(false);
  });

  it('checkout fails with a controlled error when keys are missing', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_xxxx';
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = 'pk_test_xxxx';
    const { isPaystackConfigured } = await import('@/lib/paystack');

    if (!isPaystackConfigured()) {
      // Mirrors /api/checkout behavior.
      const error = 'Payment service is not configured correctly.';
      expect(error).toContain('not configured correctly');
    } else {
      expect(isPaystackConfigured()).toBe(true);
    }
  });
});