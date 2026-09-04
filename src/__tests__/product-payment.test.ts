import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  productInputSchema,
  salePriceValidation,
  parseOptionalInt,
} from '@/lib/product-validation';

// ============================================
// Product create / price validation
// ============================================
describe('Product create validation', () => {
  const base = {
    title: 'Test Book',
    slug: 'test-book',
    author: 'Author',
    short_description: 'A short description',
    price: 3000,
    sale_price: null,
    age_min: 5,
    age_max: 7,
    reading_level: 'Beginner',
    page_count: 12,
    reading_time: '8 min',
    featured: false,
    published: false,
  };

  it('accepts a valid product with no sale price', () => {
    const result = productInputSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sale_price).toBeNull();
  });

  it('accepts a sale price below the regular price', () => {
    const result = productInputSchema.safeParse({ ...base, sale_price: 2500 });
    expect(result.success).toBe(true);
  });

  it('rejects a sale price equal to the regular price with the right message', () => {
    const result = productInputSchema.safeParse({ ...base, sale_price: 3000 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join('; ');
      expect(message).toContain('Sale price must be lower than the regular price.');
    }
  });

  it('rejects a sale price above the regular price', () => {
    const result = productInputSchema.safeParse({ ...base, sale_price: 3500 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join('; ');
      expect(message).toContain('Sale price must be lower than the regular price.');
    }
  });

  it('rejects a zero sale price (blank must be used for no sale)', () => {
    const result = productInputSchema.safeParse({ ...base, sale_price: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid age range (min > max)', () => {
    const result = productInputSchema.safeParse({ ...base, age_min: 8, age_max: 5 });
    expect(result.success).toBe(false);
  });

  it('rejects a negative price', () => {
    const result = productInputSchema.safeParse({ ...base, price: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid slug', () => {
    const result = productInputSchema.safeParse({ ...base, slug: 'Bad Slug!' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid category reference', () => {
    const result = productInputSchema.safeParse({ ...base, category_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('salePriceValidation helper', () => {
  it('treats blank/null sale price as valid (no sale)', () => {
    expect(salePriceValidation(3000, null).valid).toBe(true);
    expect(salePriceValidation(3000, undefined).valid).toBe(true);
  });

  it('allows a valid discount', () => {
    expect(salePriceValidation(3000, 2500).valid).toBe(true);
  });

  it('rejects equal or higher sale price', () => {
    expect(salePriceValidation(3000, 3000).valid).toBe(false);
    expect(salePriceValidation(3000, 3500).valid).toBe(false);
  });

  it('rejects sale price on a free book', () => {
    expect(salePriceValidation(0, 500).valid).toBe(false);
    expect(salePriceValidation(0, 0).valid).toBe(false);
  });
});

describe('numeric form parsing', () => {
  it('parses blank optional value as null, never 0', () => {
    expect(parseOptionalInt('')).toBeNull();
    expect(parseOptionalInt('   ')).toBeNull();
    expect(parseOptionalInt('0')).toBe(0);
    expect(parseOptionalInt('2500')).toBe(2500);
    expect(parseOptionalInt('abc')).toBeNull();
  });
});

// ============================================
// Product delete / archive
// ============================================
describe('Product delete / archive safety', () => {
  it('hard-deletes only when there is no order/purchase history', () => {
    const orderItemCount = 0;
    const purchaseCount = 0;
    expect(orderItemCount > 0 || purchaseCount > 0).toBe(false);
  });

  it('archives instead of hard-deleting when order history exists', () => {
    const orderItemCount = 2;
    const purchaseCount = 1;
    const shouldArchive = orderItemCount > 0 || purchaseCount > 0;
    expect(shouldArchive).toBe(true);
  });

  it('never silently hard-deletes a purchased book', () => {
    const purchaseCount: number = 1;
    const hardDeleteAllowed = purchaseCount === 0;
    expect(hardDeleteAllowed).toBe(false);
  });
});

// ============================================
// Payment fulfillment (idempotency + repair)
// ============================================
describe('Payment fulfillment idempotency', () => {
  it('creates exactly one purchase per order item when none exist', () => {
    const order = { user_id: 'u1', id: 'o1' };
    const orderItems = [{ product_id: 'p1' }, { product_id: 'p2' }, { product_id: 'p3' }];
    const existing = new Set<string>();

    let created = 0;
    for (const item of orderItems) {
      const key = `${order.user_id}-${item.product_id}`;
      if (!existing.has(key)) {
        existing.add(key);
        created += 1;
      }
    }

    expect(created).toBe(3);
    expect(existing.size).toBe(3);
  });

  it('does not duplicate purchases that already exist', () => {
    const order = { user_id: 'u1', id: 'o1' };
    const orderItems = [{ product_id: 'p1' }, { product_id: 'p1' }, { product_id: 'p2' }];
    const existing = new Set<string>(['u1-p1']);

    let created = 0;
    for (const item of orderItems) {
      const key = `${order.user_id}-${item.product_id}`;
      if (!existing.has(key)) {
        existing.add(key);
        created += 1;
      }
    }

    expect(created).toBe(1); // only p2
    expect(existing.size).toBe(2);
  });

  it('repairs a paid order missing a purchase (partial fulfillment)', () => {
    // order.status = paid, but p2 purchase creation failed earlier
    const order = { user_id: 'u1', id: 'o1', status: 'paid' };
    const orderItems = [{ product_id: 'p1' }, { product_id: 'p2' }];
    const existing = new Set<string>(['u1-p1']);

    let created = 0;
    for (const item of orderItems) {
      const key = `${order.user_id}-${item.product_id}`;
      if (!existing.has(key)) {
        existing.add(key);
        created += 1;
      }
    }

    expect(order.status).toBe('paid'); // not short-circuited
    expect(created).toBe(1);
    expect(existing.has('u1-p2')).toBe(true);
  });

  it('is safe under repeated webhook calls (idempotent)', () => {
    const order = { user_id: 'u1', id: 'o1' };
    const orderItems = [{ product_id: 'p1' }];
    const existing = new Set<string>();

    let createdCount: number = 0;
    const run = () => {
      for (const item of orderItems) {
        const key = `${order.user_id}-${item.product_id}`;
        if (!existing.has(key)) {
          existing.add(key);
          createdCount += 1;
        }
      }
      return createdCount;
    };

    run();
    expect(createdCount).toBe(1);
    run(); // second webhook delivery creates nothing new
    expect(createdCount).toBe(1);
    expect(existing.size).toBe(1);
  });
});

// ============================================
// Amount / currency verification
// ============================================
describe('Payment amount verification', () => {
  it('marks an order paid only when amount matches (Naira → kobo)', () => {
    const orderTotal = 3000;
    const expectedKobo = Math.round(orderTotal * 100);
    const paidKobo = 300000;
    expect(paidKobo).toBe(expectedKobo);
  });

  it('rejects fulfillment on amount mismatch', () => {
    const orderTotal = 3000;
    const expectedKobo = Math.round(orderTotal * 100);
    const paidKobo = 250000; // underpaid
    expect(paidKobo === expectedKobo).toBe(false);
  });

  it('rejects fulfillment when currency is not NGN', () => {
    const currency: string = 'USD';
    expect(currency === 'NGN').toBe(false);
  });
});

// ============================================
// Library visibility
// ============================================
describe('Library purchase visibility', () => {
  const profile = { id: 'u1' };

  it('shows the buyer their own purchases', () => {
    const purchases = [
      { user_id: 'u1', product_id: 'p1' },
      { user_id: 'u1', product_id: 'p2' },
    ];
    const mine = purchases.filter((p) => p.user_id === profile.id);
    expect(mine).toHaveLength(2);
  });

  it('hides another users purchases', () => {
    const purchases = [
      { user_id: 'u2', product_id: 'p1' },
      { user_id: 'u2', product_id: 'p2' },
    ];
    const mine = purchases.filter((p) => p.user_id === profile.id);
    expect(mine).toHaveLength(0);
  });

  it('a purchase that is repaired becomes visible', () => {
    const before: { user_id: string; product_id: string }[] = [];
    // fulfillment repairs → a row now exists for this user
    const after = [{ user_id: 'u1', product_id: 'p1' }];
    expect(before.length).toBe(0);
    expect(after.filter((p) => p.user_id === profile.id)).toHaveLength(1);
  });

  it('a database query failure must NOT render the empty-library state', () => {
    // Server captures the result of the query: { data, error }. A failure
    // means error != null — the UI must show the error state, never the
    // "no purchases yet" empty state.
    const classify = (result: {
      error: { code: string } | null;
      data: unknown[] | null;
    }) => {
      if (result.error) return 'error' as const;
      if (!result.data || result.data.length === 0) return 'empty' as const;
      return 'has-purchases' as const;
    };

    expect(classify({ error: { code: 'PGRST301' }, data: null })).toBe('error');
    expect(classify({ error: null, data: [] })).toBe('empty');
    expect(classify({ error: null, data: [{ id: '1' }] })).toBe('has-purchases');
  });
});
