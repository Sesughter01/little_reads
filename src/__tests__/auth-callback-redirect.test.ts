import { describe, it, expect } from 'vitest';
import { getSafeNext } from '@/lib/safe-redirect';
import { isSafeRedirectPath } from '@/lib/safe-redirect';

describe('getSafeNext (auth callback ?next= validation)', () => {
  it('accepts plain internal paths', () => {
    expect(getSafeNext('/account')).toBe('/account');
    expect(getSafeNext('/checkout/success?ref=LR-123')).toBe(
      '/checkout/success?ref=LR-123'
    );
  });

  it('accepts the recovery-flow destination (legitimate for this callback)', () => {
    expect(getSafeNext('/reset-password')).toBe('/reset-password');
  });

  it('rejects absolute URLs and schemes', () => {
    expect(getSafeNext('https://evil.com')).toBeNull();
    expect(getSafeNext('http://evil.com/path')).toBeNull();
    expect(getSafeNext('javascript:alert(1)')).toBeNull();
    expect(getSafeNext('mailto:evil@evil.com')).toBeNull();
  });

  it('rejects protocol-relative and backslash trickery', () => {
    expect(getSafeNext('//evil.com')).toBeNull();
    expect(getSafeNext('/\\evil.com')).toBeNull();
    expect(getSafeNext('\\evil.com')).toBeNull();
    expect(getSafeNext('\\\\evil.com')).toBeNull();
  });

  it('rejects percent-encoded scheme-relative forms', () => {
    expect(getSafeNext('%2F%2Fevil.com')).toBeNull();
    expect(getSafeNext('%2f%2fevil.com')).toBeNull();
  });

  it('rejects dot-segment escapes inside the origin', () => {
    expect(getSafeNext('/../admin')).toBeNull();
    expect(getSafeNext('/a/../admin')).toBeNull();
    expect(getSafeNext('%2e%2e%2fadmin')).toBeNull();
  });

  it('rejects post-sign-in loop destinations', () => {
    expect(getSafeNext('/login')).toBeNull();
    expect(getSafeNext('/register')).toBeNull();
  });

  it('rejects empty, oversized, and control-character values', () => {
    expect(getSafeNext(null)).toBeNull();
    expect(getSafeNext('')).toBeNull();
    expect(getSafeNext(`/${'a'.repeat(600)}`)).toBeNull();
    expect(getSafeNext('/account\r\nSet-Cookie: x=1')).toBeNull();
  });
});

describe('isSafeRedirectPath default vs callback mode', () => {
  it('default mode still blocks mid-flow-only pages', () => {
    expect(isSafeRedirectPath('/reset-password')).toBe(false);
    expect(isSafeRedirectPath('/forgot-password')).toBe(false);
  });

  it('callback mode (allowMidFlowOnly) accepts them', () => {
    expect(isSafeRedirectPath('/reset-password', { allowMidFlowOnly: true })).toBe(
      true
    );
    expect(isSafeRedirectPath('/forgot-password', { allowMidFlowOnly: true })).toBe(
      true
    );
  });

  it('both modes reject external targets', () => {
    for (const options of [undefined, { allowMidFlowOnly: true }]) {
      expect(isSafeRedirectPath('//evil.com', options)).toBe(false);
      expect(isSafeRedirectPath('https://evil.com', options)).toBe(false);
      expect(isSafeRedirectPath('/\\evil.com', options)).toBe(false);
    }
  });
});
