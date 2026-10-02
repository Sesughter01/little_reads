import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  CANONICAL_SITE_ORIGIN,
  isLocalCallbackHost,
  resolveCallbackOrigin,
  buildCheckoutCallbackUrl,
} from '@/lib/checkout-callback';
import { initializePaystackTransaction } from '@/lib/paystack';
import {
  evaluateCustomerReconcile,
  evaluateAdminReconcile,
  type ReconcileOrderShape,
} from '@/lib/reconcile-policy';
import { maskReference, validateVerifiedPayment } from '@/lib/fulfillment';

// ============================================
// Paystack callback origin construction
// ============================================
function fakeRequest(host: string | null, proto = 'https') {
  return {
    get(name: string) {
      if (name === 'x-forwarded-host') return host;
      if (name === 'host') return host;
      if (name === 'x-forwarded-proto') return proto;
      return null;
    },
  };
}

const prodOrder = {
  id: 'o1',
  user_id: 'u-buyer',
  status: 'pending',
  paystack_reference: 'LR-ABC123',
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const TEST_KEY_ENV = {
  PAYSTACK_SECRET_KEY: 'sk_test_abc123def456',
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: 'pk_test_abc123def456',
};

const LIVE_KEY_ENV = {
  PAYSTACK_SECRET_KEY: 'sk_live_abc123def456',
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: 'pk_live_abc123def456',
};

describe('Callback origin construction', () => {
  it('uses the canonical production URL for a production request', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYSTACK_SECRET_KEY', LIVE_KEY_ENV.PAYSTACK_SECRET_KEY);
    vi.stubEnv(
      'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
      LIVE_KEY_ENV.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    );
    const origin = resolveCallbackOrigin(fakeRequest('littlereads.com.ng'));
    expect(origin).toBe(CANONICAL_SITE_ORIGIN);
  });

  it('keeps LIVE-mode callbacks pinned to production even on a preview host', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYSTACK_SECRET_KEY', LIVE_KEY_ENV.PAYSTACK_SECRET_KEY);
    vi.stubEnv(
      'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
      LIVE_KEY_ENV.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    );
    const origin = resolveCallbackOrigin(
      fakeRequest('little-reads-3o3a2ud48-sesughter01s-projects.vercel.app')
    );
    expect(origin).toBe(CANONICAL_SITE_ORIGIN);
  });

  it('routes TEST-mode preview checkouts back to the preview deployment origin', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYSTACK_SECRET_KEY', TEST_KEY_ENV.PAYSTACK_SECRET_KEY);
    vi.stubEnv(
      'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
      TEST_KEY_ENV.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    );
    const origin = resolveCallbackOrigin(fakeRequest('little-reads.vercel.app'));
    expect(origin).toBe('https://little-reads.vercel.app');
  });

  it('honors an explicitly forwarded http proto for TEST-mode preview returns', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYSTACK_SECRET_KEY', TEST_KEY_ENV.PAYSTACK_SECRET_KEY);
    vi.stubEnv(
      'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
      TEST_KEY_ENV.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    );
    const origin = resolveCallbackOrigin(
      fakeRequest('little-reads.vercel.app', 'http')
    );
    expect(origin).toBe('http://little-reads.vercel.app');
  });

  it('fails closed to the canonical origin when keys are missing (no env)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYSTACK_SECRET_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY', '');
    const origin = resolveCallbackOrigin(fakeRequest('little-reads.vercel.app'));
    expect(origin).toBe(CANONICAL_SITE_ORIGIN);
  });

  it('fails closed to the canonical origin when keys are placeholders', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYSTACK_SECRET_KEY', 'sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    vi.stubEnv(
      'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
      'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    );
    const origin = resolveCallbackOrigin(fakeRequest('little-reads.vercel.app'));
    expect(origin).toBe(CANONICAL_SITE_ORIGIN);
  });

  it('keeps localhost callbacks working in development (http proto)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('PAYSTACK_SECRET_KEY', TEST_KEY_ENV.PAYSTACK_SECRET_KEY);
    vi.stubEnv(
      'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
      TEST_KEY_ENV.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    );
    expect(
      resolveCallbackOrigin(fakeRequest('localhost:3000', 'http'))
    ).toBe('http://localhost:3000');
  });

  it('supports HTTPS loopback when explicitly forwarded during development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('PAYSTACK_SECRET_KEY', TEST_KEY_ENV.PAYSTACK_SECRET_KEY);
    vi.stubEnv(
      'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
      TEST_KEY_ENV.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    );
    expect(
      resolveCallbackOrigin(fakeRequest('localhost:3000', 'https'))
    ).toBe('https://localhost:3000');
  });

  it('recognizes only loopback hosts as local callback targets', () => {
    expect(isLocalCallbackHost('localhost:3000')).toBe(true);
    expect(isLocalCallbackHost('127.0.0.1:4321')).toBe(true);
    expect(isLocalCallbackHost('evil.example.com')).toBe(false);
    expect(isLocalCallbackHost('localhost.evil.example.com')).toBe(false);
  });

  it('ignores a stale NEXT_PUBLIC_SITE_URL in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYSTACK_SECRET_KEY', LIVE_KEY_ENV.PAYSTACK_SECRET_KEY);
    vi.stubEnv(
      'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
      LIVE_KEY_ENV.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    );
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://upskiiltech.com');
    const origin = resolveCallbackOrigin(fakeRequest('evil.example.com'));
    expect(origin).toBe(CANONICAL_SITE_ORIGIN);
  });

  it('ignores Vercel URL environment variables', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYSTACK_SECRET_KEY', LIVE_KEY_ENV.PAYSTACK_SECRET_KEY);
    vi.stubEnv(
      'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
      LIVE_KEY_ENV.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    );
    vi.stubEnv('VERCEL_URL', 'random-preview.vercel.app');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'old-project.vercel.app');
    expect(resolveCallbackOrigin(fakeRequest('random-preview.vercel.app'))).toBe(
      CANONICAL_SITE_ORIGIN
    );
  });

  it('builds the full success-page callback URL with the reference', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYSTACK_SECRET_KEY', LIVE_KEY_ENV.PAYSTACK_SECRET_KEY);
    vi.stubEnv(
      'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
      LIVE_KEY_ENV.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    );
    const url = buildCheckoutCallbackUrl(
      fakeRequest('little-reads.vercel.app'),
      'LR-ABC123'
    );
    expect(url).toBe(
      'https://littlereads.com.ng/checkout/success?ref=LR-ABC123'
    );
  });

  it('builds a TEST-mode preview callback URL on the preview deployment', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYSTACK_SECRET_KEY', TEST_KEY_ENV.PAYSTACK_SECRET_KEY);
    vi.stubEnv(
      'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
      TEST_KEY_ENV.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    );
    const url = buildCheckoutCallbackUrl(
      fakeRequest('little-reads.vercel.app'),
      'LR-ABC123'
    );
    expect(url).toBe(
      'https://little-reads.vercel.app/checkout/success?ref=LR-ABC123'
    );
  });

  it('encodes the reference in the callback URL', () => {
    const url = buildCheckoutCallbackUrl(
      fakeRequest('little-reads.vercel.app'),
      'LR-ABC 123'
    );
    expect(new URL(url).searchParams.get('ref')).toBe('LR-ABC 123');
  });

  it('sends the intended callback_url in Paystack initialization', async () => {
    const callbackUrl = 'https://littlereads.com.ng/checkout/success?ref=LR-ABC123';
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      // Keep both arguments observable so this remains a real fetch-shaped mock.
      expect(input.toString()).toBe('https://api.paystack.co/transaction/initialize');
      expect(init?.method).toBe('POST');
      return new Response(
        JSON.stringify({
          status: true,
          message: 'Authorization URL created',
          data: {
            authorization_url: 'https://checkout.paystack.com/access-code',
            access_code: 'access-code',
            reference: 'LR-ABC123',
          },
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await initializePaystackTransaction({
      email: 'buyer@example.com',
      amount: 150000,
      reference: 'LR-ABC123',
      callback_url: callbackUrl,
    });

    expect(result.data.authorization_url).toContain('checkout.paystack.com');
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toMatchObject({
      amount: 150000,
      reference: 'LR-ABC123',
      callback_url: callbackUrl,
      currency: 'NGN',
    });
  });
});

describe('Verified payment write gate', () => {
  const expected = {
    reference: 'LR-ABC123',
    totalNaira: 1500,
    currency: 'NGN',
  };
  const paid = {
    status: 'success',
    reference: 'LR-ABC123',
    amount: 150000,
    currency: 'NGN',
  };

  it('accepts only the exact successful transaction for the order', () => {
    expect(validateVerifiedPayment(expected, paid)).toBeNull();
  });

  it('rejects an invalid or mismatched reference before writes', () => {
    expect(
      validateVerifiedPayment(expected, { ...paid, reference: 'LR-OTHER' })
    ).toBe('REFERENCE_MISMATCH');
  });

  it('rejects an amount mismatch before writes', () => {
    expect(validateVerifiedPayment(expected, { ...paid, amount: 149999 })).toBe(
      'AMOUNT_MISMATCH'
    );
  });

  it('rejects non-success and currency mismatch transactions before writes', () => {
    expect(validateVerifiedPayment(expected, { ...paid, status: 'failed' })).toBe(
      'NOT_PAID'
    );
    expect(validateVerifiedPayment(expected, { ...paid, currency: 'USD' })).toBe(
      'CURRENCY_MISMATCH'
    );
  });
});

// ============================================
// Customer reconcile policy
// ============================================
describe('Customer reconcile policy', () => {
  it('denies reconciliation of an order that does not exist', () => {
    const decision = evaluateCustomerReconcile(null, 'u-buyer');
    expect(decision.allow).toBe(false);
    if (!decision.allow) {
      expect(decision.status).toBe(404);
      expect(decision.code).toBe('ORDER_NOT_FOUND');
    }
  });

  it('denies another user reconciling someone else order (403, never 404)', () => {
    const decision = evaluateCustomerReconcile(prodOrder, 'u-attacker');
    expect(decision.allow).toBe(false);
    if (!decision.allow) {
      expect(decision.status).toBe(403);
      expect(decision.code).toBe('ORDER_NOT_YOURS');
    }
  });

  it('denies an order with no Paystack reference', () => {
    const decision = evaluateCustomerReconcile(
      { ...prodOrder, paystack_reference: null },
      'u-buyer'
    );
    expect(decision.allow).toBe(false);
    if (!decision.allow) {
      expect(decision.status).toBe(400);
      expect(decision.code).toBe('NO_PAYSTACK_REFERENCE');
    }
  });

  it('allows the owning customer to reconcile a pending order', () => {
    const decision = evaluateCustomerReconcile(prodOrder, 'u-buyer');
    expect(decision.allow).toBe(true);
    if (decision.allow) {
      expect(decision.order.paystack_reference).toBe('LR-ABC123');
    }
  });

  it('allows reconciliation of an already-paid order (repair path)', () => {
    const decision = evaluateCustomerReconcile(
      { ...prodOrder, status: 'paid' },
      'u-buyer'
    );
    expect(decision.allow).toBe(true);
  });
});

// ============================================
// Admin reconcile policy
// ============================================
describe('Admin reconcile policy', () => {
  it('denies when the order is missing', () => {
    const decision = evaluateAdminReconcile(null);
    expect(decision.allow).toBe(false);
    if (!decision.allow) expect(decision.status).toBe(404);
  });

  it('denies when the order has no Paystack reference', () => {
    const decision = evaluateAdminReconcile({
      ...prodOrder,
      paystack_reference: null,
    } as ReconcileOrderShape);
    expect(decision.allow).toBe(false);
    if (!decision.allow) expect(decision.status).toBe(400);
  });

  it('allows verifying an order that carries a reference, whatever its status', () => {
    for (const status of ['pending', 'paid', 'failed']) {
      const decision = evaluateAdminReconcile({
        ...prodOrder,
        status,
      } as ReconcileOrderShape);
      expect(decision.allow).toBe(true);
    }
  });
});

// ============================================
// Safe diagnostics masking
// ============================================
describe('Safe reference masking', () => {
  it('masks long references so full transaction IDs never reach logs', () => {
    const masked = maskReference('LR-M1GZQW9X-ABC123');
    expect(masked).not.toContain('M1GZQW9X');
    expect(masked.length).toBeLessThan(10);
    expect(masked.startsWith('LR')).toBe(true);
    expect(masked.endsWith('123')).toBe(true);
  });

  it('handles empty and null references', () => {
    expect(maskReference(null)).toBe('(none)');
    expect(maskReference('')).toBe('(none)');
    expect(maskReference(undefined)).toBe('(none)');
  });
});
