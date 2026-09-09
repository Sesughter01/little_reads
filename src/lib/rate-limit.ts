'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Frontend UX for rate limiting (Supabase Auth 429 responses).
 *
 * isRateLimitError() classifies an auth error so forms can show a friendly,
 * actionable message instead of a raw provider string, and start a visible
 * cooldown so users know exactly when they can retry.
 */

const RATE_LIMIT_MESSAGE_RE =
  /rate limit|too many|try again in \d+|once every \d+|wait \d+ seconds/i;

/** True when an auth error is a rate-limit rejection (HTTP 429 or matching wording). */
export function isRateLimitError(error: unknown): boolean {
  if (typeof error === 'string') return RATE_LIMIT_MESSAGE_RE.test(error);
  if (!error || typeof error !== 'object') return false;

  const status = (error as { status?: unknown }).status;
  if (status === 429 || status === '429') return true;

  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && RATE_LIMIT_MESSAGE_RE.test(message);
}

export const RATE_LIMIT_COOLDOWN_SECONDS = 60;

/**
 * Visible retry cooldown (seconds) that ticks down to zero. Start it after a
 * 429 — or a successful email send — so the UI communicates when retrying is
 * possible instead of letting users hammer a button that keeps failing.
 */
export function useRateLimitCooldown(seconds = RATE_LIMIT_COOLDOWN_SECONDS) {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const startCooldown = useCallback(() => setCooldown(seconds), [seconds]);

  return { cooldown, startCooldown };
}
