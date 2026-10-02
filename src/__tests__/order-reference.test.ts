import { describe, it, expect } from 'vitest';
import { generateOrderReference } from '@/lib/paystack';

describe('generateOrderReference', () => {
  it('produces the LR-<timestamp>-<random> shape', () => {
    const ref = generateOrderReference();
    expect(ref).toMatch(/^LR-[A-Z0-9]+-[A-Z0-9]{6}$/);
  });

  it('is random — repeated references differ in their random part', () => {
    const refs = new Set(Array.from({ length: 50 }, () => generateOrderReference()));
    // All 50 random suffixes being distinct is overwhelmingly expected for a
    // 24-bit+ space; a Math.random-based collision streak is far likelier.
    expect(refs.size).toBeGreaterThan(45);
  });

  it('never collides within a tight burst (uniqueness contract for the DB UNIQUE column)', () => {
    const refs = Array.from({ length: 200 }, () => generateOrderReference());
    expect(new Set(refs).size).toBe(refs.length);
  });
});
