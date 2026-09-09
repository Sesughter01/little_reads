'use client';

import { useCallback, useRef } from 'react';

/**
 * Synchronous double-submit guard.
 *
 * `disabled={busy}` only takes effect after React re-renders, so two rapid
 * clicks in the same frame can both enter a handler before the button
 * visually disables — enough to duplicate orders, reviews or sign-in calls.
 * This guard closes that gap: the claim is a synchronous ref check-and-set,
 * so a second click is always rejected even before any re-render.
 */

export interface ClickGuard {
  /** Returns true exactly once per flight; false until release() is called. */
  claim(): boolean;
  /** Ends the current flight, allowing the next claim(). */
  release(): void;
}

/** Framework-free implementation, unit-testable in isolation. */
export function createClickGuard(): ClickGuard {
  let inFlight = false;

  return {
    claim(): boolean {
      if (inFlight) return false;
      inFlight = true;
      return true;
    },
    release(): void {
      inFlight = false;
    },
  };
}

/**
 * Per-component-instance guard. The ref is mutated only inside claim/release
 * (event handlers), never during render.
 *
 * Usage:
 *   const guard = useClickGuard();
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     if (!guard.claim()) return; // rapid repeat click — ignore
 *     try { ... } finally { guard.release(); }
 *   };
 *
 * For flows that end in navigation (login, checkout redirect), release only
 * on the error paths and let the unmount end the flight.
 */
export function useClickGuard(): ClickGuard {
  const inFlight = useRef(false);

  const claim = useCallback((): boolean => {
    if (inFlight.current) return false;
    inFlight.current = true;
    return true;
  }, []);

  const release = useCallback((): void => {
    inFlight.current = false;
  }, []);

  return { claim, release };
}
