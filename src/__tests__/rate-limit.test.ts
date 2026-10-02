import { describe, it, expect } from 'vitest';
import { isRateLimitError } from '@/lib/rate-limit';

describe('isRateLimitError', () => {
  // ---------- genuine rate limits ----------

  it('detects a numeric 429 status', () => {
    expect(isRateLimitError({ status: 429, message: 'anything' })).toBe(true);
  });

  it('detects a string 429 status', () => {
    expect(isRateLimitError({ status: '429' })).toBe(true);
  });

  it('detects Supabase rate-limit codes', () => {
    expect(
      isRateLimitError({ code: 'over_email_send_rate_limit' })
    ).toBe(true);
    expect(
      isRateLimitError({
        code: 'over_email_send_rate_limit',
        message: 'Email rate limit exceeded',
      })
    ).toBe(true);
    expect(isRateLimitError({ code: 'over_request_rate_limit' })).toBe(true);
    expect(isRateLimitError({ code: 'over_sms_send_rate_limit' })).toBe(true);
  });

  it('detects clearly rate-limit-related messages', () => {
    expect(isRateLimitError({ message: 'rate limit exceeded' })).toBe(true);
    expect(isRateLimitError({ message: 'Email rate limit exceeded' })).toBe(true);
    expect(isRateLimitError({ message: 'Too many requests' })).toBe(true);
    expect(
      isRateLimitError({
        message: 'You can only request this once every 60 seconds',
      })
    ).toBe(true);
  });

  it('detects a bare string error with rate-limit wording', () => {
    expect(isRateLimitError('rate limit exceeded')).toBe(true);
    expect(isRateLimitError('Too many requests')).toBe(true);
  });

  // ---------- must NOT be classified as rate limit ----------

  it('NEVER classifies 503 as rate limit, even with matching wording', () => {
    expect(
      isRateLimitError({ status: 503, message: 'rate limit exceeded' })
    ).toBe(false);
    expect(
      isRateLimitError({ status: 503, message: 'Too many requests' })
    ).toBe(false);
    expect(isRateLimitError({ status: '503' })).toBe(false);
    expect(
      isRateLimitError({
        status: 503,
        code: 'over_email_send_rate_limit',
      })
    ).toBe(false);
  });

  it('rejects other HTTP error statuses', () => {
    expect(isRateLimitError({ status: 400 })).toBe(false);
    expect(isRateLimitError({ status: 401 })).toBe(false);
    expect(isRateLimitError({ status: 403 })).toBe(false);
    expect(isRateLimitError({ status: 500 })).toBe(false);
  });

  it('rejects ordinary auth/validation errors', () => {
    expect(isRateLimitError({ message: 'Invalid login credentials' })).toBe(false);
    expect(
      isRateLimitError({ status: 400, message: 'email not confirmed' })
    ).toBe(false);
    expect(
      isRateLimitError({ status: 400, message: 'Password should be at least 6 characters' })
    ).toBe(false);
  });

  it('rejects network/service errors', () => {
    expect(isRateLimitError(new TypeError('Failed to fetch'))).toBe(false);
    expect(
      isRateLimitError({ message: 'TypeError: Failed to fetch' })
    ).toBe(false);
    expect(isRateLimitError({ message: 'Service Unavailable' })).toBe(false);
  });

  it('rejects ambiguous wait-style wording without a 429 status', () => {
    // "try again in N seconds" alone is not proof of rate limiting
    expect(isRateLimitError({ message: 'Try again in 30 seconds' })).toBe(false);
    expect(isRateLimitError({ status: 400, message: 'Try again in 30 seconds' })).toBe(false);
  });

  it('is safe for non-object, non-string values', () => {
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
    expect(isRateLimitError(429)).toBe(false);
    expect(isRateLimitError({})).toBe(false);
    expect(isRateLimitError([])).toBe(false);
  });
});
