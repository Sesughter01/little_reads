import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  selectPendingOrdersForReconcile,
  MIN_ORDER_AGE_MS,
  type PendingOrderShape,
} from '@/lib/reconcile-pending';

afterEach(() => {
  vi.unstubAllEnvs();
});

const now = Date.parse('2026-09-07T12:00:00Z');

function order(overrides: Partial<PendingOrderShape>): PendingOrderShape {
  return {
    id: 'o1',
    status: 'pending',
    paystack_reference: 'LR-ABC123',
    created_at: new Date(now - MIN_ORDER_AGE_MS - 1000).toISOString(),
    ...overrides,
  };
}

describe('selectPendingOrdersForReconcile', () => {
  it('selects stale pending orders that carry a Paystack reference', () => {
    const eligible = order({});
    const selected = selectPendingOrdersForReconcile([eligible], now);
    expect(selected).toEqual([eligible]);
  });

  it('excludes orders that are already paid', () => {
    const selected = selectPendingOrdersForReconcile(
      [order({ status: 'paid' })],
      now
    );
    expect(selected).toEqual([]);
  });

  it('excludes orders with no Paystack reference (nothing to verify)', () => {
    const selected = selectPendingOrdersForReconcile(
      [order({ paystack_reference: null })],
      now
    );
    expect(selected).toEqual([]);
  });

  it('excludes orders younger than MIN_ORDER_AGE_MS (in-flight checkout)', () => {
    const fresh = order({
      created_at: new Date(now - 5_000).toISOString(),
    });
    const selected = selectPendingOrdersForReconcile([fresh], now);
    expect(selected).toEqual([]);
  });

  it('selects an order exactly at the minimum age', () => {
    const boundary = order({
      created_at: new Date(now - MIN_ORDER_AGE_MS).toISOString(),
    });
    const selected = selectPendingOrdersForReconcile([boundary], now);
    expect(selected).toEqual([boundary]);
  });

  it('selects an order whose timestamp is missing (verify it anyway)', () => {
    const selected = selectPendingOrdersForReconcile(
      [order({ created_at: null })],
      now
    );
    expect(selected).toHaveLength(1);
  });

  it('keeps the ordering of the input', () => {
    const a = order({ id: 'a', paystack_reference: 'LR-A' });
    const b = order({ id: 'b', paystack_reference: 'LR-B' });
    const c = order({ id: 'c', status: 'paid' });
    const selected = selectPendingOrdersForReconcile([a, c, b], now);
    expect(selected.map((o) => o.id)).toEqual(['a', 'b']);
  });
});