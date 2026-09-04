import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isAllowedCallbackHost,
  resolveCallbackOrigin,
  buildCheckoutCallbackUrl,
} from '@/lib/checkout-callback';
import {
  evaluateCustomerReconcile,
  evaluateAdminReconcile,
  type ReconcileOrderShape,
} from '@/lib/reconcile-policy';
import { maskReference } from '@/lib/fulfillment';

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
});

describe('Callback origin construction', () => {
  it('derives the production origin from the live request host', () => {
    const origin = resolveCallbackOrigin(fakeRequest('little-reads.vercel.app'));
    expect(origin).toBe('https://little-reads.vercel.app');
  });

  it('derives a Preview origin from the request when running on a preview alias', () => {
    const origin = resolveCallbackOrigin(
      fakeRequest('little-reads-3o3a2ud48-sesughter01s-projects.vercel.app')
    );
    expect(origin).toBe(
      'https://little-reads-3o3a2ud48-sesughter01s-projects.vercel.app'
    );
  });

  it('keeps localhost callbacks working in development (http proto)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(
      resolveCallbackOrigin(fakeRequest('localhost:3000', 'http'))
    ).toBe('http://localhost:3000');
  });

  it('derives the proto from the trusted proxy header when present', () => {
    expect(
      resolveCallbackOrigin(fakeRequest('localhost:3000', 'https'))
    ).toBe('https://localhost:3000');
  });

  it('honors x-forwarded-proto when present', () => {
    const origin = resolveCallbackOrigin(
      fakeRequest('little-reads.vercel.app', 'http')
    );
    expect(origin).toBe('http://little-reads.vercel.app');
  });

  it('never lets a foreign host steer the callback (falls back to configured site URL)', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://little-reads.vercel.app');
    const origin = resolveCallbackOrigin(fakeRequest('evil.example.com'));
    expect(origin).toBe('https://little-reads.vercel.app');
  });

  it('falls back to localhost when host is foreign and no site URL is configured', () => {
    const origin = resolveCallbackOrigin(fakeRequest('evil.example.com'));
    expect(origin).toBe('http://localhost:3000');
  });

  it('rejects disallowed hosts in the allow-list check', () => {
    expect(isAllowedCallbackHost('evil.example.com')).toBe(false);
    expect(isAllowedCallbackHost('notvercel.app.evil.com')).toBe(false);
    expect(isAllowedCallbackHost(null)).toBe(false);
  });

  it('builds the full success-page callback URL with the reference', () => {
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
    expect(url).toContain('ref=LR-ABC%20123');
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
