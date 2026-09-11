import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  resetRateLimits,
  clientIpFromRequest,
  tooManyRequestsResponse,
} from '@/lib/api-rate-limit';

beforeEach(() => {
  resetRateLimits();
});

describe('checkRateLimit', () => {
  it('allows requests under the limit', () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit('contact:1.2.3.4', 5, 60_000);
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks the request that exceeds the limit', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('contact:1.2.3.4', 5, 60_000);
    }
    const denied = checkRateLimit('contact:1.2.3.4', 5, 60_000);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('keys limits independently per namespace and client', () => {
    checkRateLimit('contact:1.2.3.4', 1, 60_000);
    expect(checkRateLimit('contact:1.2.3.4', 1, 60_000).allowed).toBe(false);
    // Different IP: fresh bucket.
    expect(checkRateLimit('contact:5.6.7.8', 1, 60_000).allowed).toBe(true);
    // Different route: fresh bucket.
    expect(checkRateLimit('newsletter:1.2.3.4', 1, 60_000).allowed).toBe(true);
  });

  it('resets the window after expiry', () => {
    const now = 1_000_000;
    checkRateLimit('reviews:user-1', 1, 60_000, now);
    expect(checkRateLimit('reviews:user-1', 1, 60_000, now + 1000).allowed).toBe(false);
    // After the window has passed the bucket resets.
    expect(checkRateLimit('reviews:user-1', 1, 60_000, now + 61_000).allowed).toBe(true);
  });

  it('reports remaining count accurately', () => {
    checkRateLimit('checkout:user-9', 3, 60_000);
    const second = checkRateLimit('checkout:user-9', 3, 60_000);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);
    const third = checkRateLimit('checkout:user-9', 3, 60_000);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
    const fourth = checkRateLimit('checkout:user-9', 3, 60_000);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });
});

describe('clientIpFromRequest', () => {
  function fakeRequest(headers: Record<string, string>): Request {
    return new Request('https://example.com/api', { headers });
  }

  it('reads the first x-forwarded-for entry', () => {
    expect(
      clientIpFromRequest(
        fakeRequest({ 'x-forwarded-for': '203.0.113.7, 70.41.3.25' })
      )
    ).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip then unknown', () => {
    expect(clientIpFromRequest(fakeRequest({ 'x-real-ip': '198.51.100.2' }))).toBe(
      '198.51.100.2'
    );
    expect(clientIpFromRequest(fakeRequest({}))).toBe('unknown');
  });
});

describe('tooManyRequestsResponse', () => {
  it('returns a 429 with Retry-After', async () => {
    const response = tooManyRequestsResponse({
      allowed: false,
      limit: 5,
      remaining: 0,
      retryAfterSeconds: 42,
    });
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('42');
    const body = await response.json();
    expect(body.error).toMatch(/too many requests/i);
  });
});
