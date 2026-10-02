'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Frontend UX for rate limiting (Supabase Auth 429 responses).
 *
 * isRateLimitError() classifies an auth error so forms can show a friendly,
 * actionable message instead of a raw provider string, and start a visible
 * cooldown so users know exactly when they can retry.
 *
 * Classification sources, in order:
 *   1. HTTP status 429            -> rate limited
 *   2. HTTP status 503            -> NEVER rate limited (service unavailable
 *      must stay a separate error even if wording matches)
 *   3. Supabase error codes       -> `over_email_send_rate_limit`,
 *      `over_request_rate_limit`, `over_sms_send_rate_limit`, etc.
 *      (detected via the shared `rate_limit` code fragment)
 *   4. Clearly rate-limit-related message wording
 *
 * Everything else — 400/401/403/500, ordinary validation errors, network or
 * service failures — is NOT a rate-limit error.
 */

const RATE_LIMIT_MESSAGE_RE =
  /rate limit|too many requests|once every \d+/i;

const RATE_LIMIT_CODE_RE = /rate_limit/i;

/** True when an auth error is a genuine rate-limit rejection. */
export function isRateLimitError(error: unknown): boolean {
  if (typeof error === 'string') return RATE_LIMIT_MESSAGE_RE.test(error);
  if (!error || typeof error !== 'object') return false;

  const { status, code, message } = error as {
    status?: unknown;
    code?: unknown;
    message?: unknown;
  };

  // Service unavailable is a distinct failure mode — never report it as
  // rate limiting, regardless of any matching wording.
  if (status === 503 || status === '503') return false;

  if (status === 429 || status === '429') return true;

  // Supabase rate-limit error codes (over_*_rate_limit family).
  if (typeof code === 'string' && RATE_LIMIT_CODE_RE.test(code)) return true;

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
