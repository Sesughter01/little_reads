import { describe, it, expect } from 'vitest';
import { createClickGuard } from '@/lib/click-guard';

describe('createClickGuard', () => {
  it('claims exactly once while in flight', () => {
    const guard = createClickGuard();
    expect(guard.claim()).toBe(true);
    expect(guard.claim()).toBe(false);
    expect(guard.claim()).toBe(false);
  });

  it('allows a new claim after release', () => {
    const guard = createClickGuard();
    expect(guard.claim()).toBe(true);
    guard.release();
    expect(guard.claim()).toBe(true);
  });

  it('release is idempotent and safe without a prior claim', () => {
    const guard = createClickGuard();
    guard.release();
    expect(guard.claim()).toBe(true);
    guard.release();
    guard.release();
    expect(guard.claim()).toBe(true);
  });

  it('simulated same-frame double click runs the handler once per flight', async () => {
    const guard = createClickGuard();
    let calls = 0;

    const handler = async () => {
      if (!guard.claim()) return; // second click of a rapid pair is a no-op
      calls += 1;
      await new Promise((r) => setTimeout(r, 5));
      guard.release();
    };

    // Two click pairs fired while a flight is (or is not) in progress —
    // the exact race that `disabled={busy}` misses before re-render.
    await Promise.all([handler(), handler()]);
    await Promise.all([handler(), handler()]);

    expect(calls).toBe(2);
  });

  it('keeps rejecting during a long flight, then recovers', async () => {
    const guard = createClickGuard();
    let releaseFlight!: () => void;
    const flight = new Promise<void>((resolve) => {
      releaseFlight = resolve;
    });

    expect(guard.claim()).toBe(true);

    const lateClicks = [guard.claim(), guard.claim(), guard.claim()];
    expect(lateClicks).toEqual([false, false, false]);

    releaseFlight();
    await flight;
    guard.release();

    expect(guard.claim()).toBe(true);
  });
});
