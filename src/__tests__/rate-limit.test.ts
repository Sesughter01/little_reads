import { describe, it, expect } from 'vitest';
import { isRateLimitError } from '@/lib/rate-limit';

describe('isRateLimitError', () => {
  it('detects a numeric 429 status', () => {
    expect(isRateLimitError({ status: 429, message: 'anything' })).toBe(true);
  });

  it('detects a string 429 status', () => {
    expect(isRateLimitError({ status: '429' })).toBe(true);
  });

  it('detects rate-limit wording in the message', () => {
    expect(isRateLimitError({ message: 'Rate limit exceeded' })).toBe(true);
    expect(isRateLimitError({ message: 'Too many requests' })).toBe(true);
    expect(
      isRateLimitError({
        message: 'You can only request this once every 60 seconds',
      })
    ).toBe(true);
    expect(isRateLimitError({ message: 'Try again in 30 seconds' })).toBe(true);
  });

  it('detects a bare string error', () => {
    expect(isRateLimitError('Too many requests')).toBe(true);
    expect(isRateLimitError('Invalid login credentials')).toBe(false);
  });

  it('rejects unrelated auth errors', () => {
    expect(isRateLimitError({ message: 'Invalid login credentials' })).toBe(false);
    expect(isRateLimitError({ status: 400, message: 'email not confirmed' })).toBe(false);
    expect(isRateLimitError({ status: 500 })).toBe(false);
  });

  it('is safe for non-object, non-string values', () => {
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
    expect(isRateLimitError(429)).toBe(false);
    expect(isRateLimitError({})).toBe(false);
  });
});
