import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  isSafeRedirectPath,
  safeRedirectPath,
} from '@/lib/safe-redirect';

// ============================================================
// safe-redirect pure validation
// ============================================================
describe('isSafeRedirectPath', () => {
  it('accepts plain internal paths', () => {
    expect(isSafeRedirectPath('/account')).toBe(true);
    expect(isSafeRedirectPath('/account/library')).toBe(true);
    expect(isSafeRedirectPath('/checkout')).toBe(true);
  });

  it('accepts internal paths with query and hash', () => {
    expect(isSafeRedirectPath('/checkout/success?ref=LR-123')).toBe(true);
    expect(isSafeRedirectPath('/account/orders#latest')).toBe(true);
  });

  it('rejects external absolute URLs', () => {
    expect(isSafeRedirectPath('https://evil.example')).toBe(false);
    expect(isSafeRedirectPath('http://evil.example/path')).toBe(false);
  });

  it('rejects protocol-relative URLs', () => {
    expect(isSafeRedirectPath('//evil.example')).toBe(false);
  });

  it('rejects percent-encoded protocol-relative URLs', () => {
    expect(isSafeRedirectPath('%2F%2Fevil.example')).toBe(false);
  });

  it('rejects backslash-based scheme-relative URLs', () => {
    expect(isSafeRedirectPath('/\\evil.example')).toBe(false);
    expect(isSafeRedirectPath('\\evil.example')).toBe(false);
  });

  it('rejects javascript: and other schemes', () => {
    expect(isSafeRedirectPath('javascript:alert(1)')).toBe(false);
    expect(isSafeRedirectPath('mailto:evil@example.com')).toBe(false);
    expect(isSafeRedirectPath('HTTPS://evil.example')).toBe(false);
  });

  it('rejects self-auth destinations that would loop', () => {
    expect(isSafeRedirectPath('/login')).toBe(false);
    expect(isSafeRedirectPath('/register')).toBe(false);
    expect(isSafeRedirectPath('/login?verified=1')).toBe(false);
  });

  it('rejects mid-flow recovery destinations', () => {
    expect(isSafeRedirectPath('/forgot-password')).toBe(false);
    expect(isSafeRedirectPath('/reset-password')).toBe(false);
  });

  it('rejects dot-segments escaping the app root', () => {
    expect(isSafeRedirectPath('/../admin')).toBe(false);
    expect(isSafeRedirectPath('checkout/../../admin')).toBe(false);
  });

  it('rejects control characters and oversized values', () => {
    expect(isSafeRedirectPath('/acc\u0000ount')).toBe(false);
    expect(isSafeRedirectPath('/account\n')).toBe(false);
    expect(isSafeRedirectPath(`/${'a'.repeat(600)}`)).toBe(false);
  });

  it('rejects empty and nullish values', () => {
    expect(isSafeRedirectPath('')).toBe(false);
    expect(isSafeRedirectPath(null)).toBe(false);
    expect(isSafeRedirectPath(undefined)).toBe(false);
  });
});

describe('safeRedirectPath', () => {
  it('returns the candidate when safe', () => {
    expect(safeRedirectPath('/checkout', '/account')).toBe('/checkout');
  });

  it('falls back when unsafe or missing', () => {
    expect(safeRedirectPath('//evil.example', '/account')).toBe('/account');
    expect(safeRedirectPath(null, '/account')).toBe('/account');
    expect(safeRedirectPath('', '/account')).toBe('/account');
  });
});

// ============================================================
// Structural contract: the recovery flow is wired end-to-end
// ============================================================
describe('password reset flow wiring', () => {
  const readSrc = (relative: string) =>
    fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf-8');

  it('a /reset-password page exists with a client component', () => {
    const page = readSrc('app/(auth)/reset-password/page.tsx');
    expect(page).toContain('ResetPasswordClient');
  });

  it('reset client updates the password with the recovery session, then signs out everywhere', () => {
    const client = readSrc(
      'app/(auth)/reset-password/reset-password-client.tsx'
    );
    // The single authorized capability of a recovery session:
    expect(client).toContain('auth.updateUser({ password })');
    // Recovery sessions must never persist as a normal login:
    expect(client).toContain('auth.signOut()');
    // Lands on login with the success signal:
    expect(client).toContain("router.push('/login?reset=1')");
  });

  it('the auth callback still preserves the recovery session for /reset-password', () => {
    const callback = readSrc('app/auth/callback/route.ts');
    expect(callback).toContain("'/reset-password'");
    // Recovery path must NOT sign out before redirecting (updateUser needs
    // the session); the verification path signs out after exchange.
    expect(callback).toContain('supabase.auth.signOut()');
  });

  it('forgot-password builds the recovery callback with next=/reset-password', () => {
    const forgot = readSrc('app/(auth)/forgot-password/forgot-password-client.tsx');
    expect(forgot).toContain("'/reset-password'");
  });

  it('forgot-password surfaces the invalid_recovery_link callback error', () => {
    const forgot = readSrc('app/(auth)/forgot-password/forgot-password-client.tsx');
    expect(forgot).toContain('invalid_recovery_link');
  });

  it('login shows the password-reset success banner', () => {
    const login = readSrc('app/(auth)/login/login-client.tsx');
    expect(login).toContain("params.get('reset') === '1'");
  });

  it('auth clients never navigate raw ?redirect values', () => {
    const authFiles = [
      'app/(auth)/login/login-client.tsx',
      'app/(auth)/login/verify-otp/verify-otp-client.tsx',
      'app/(auth)/register/register-client.tsx',
    ];
    for (const file of authFiles) {
      const content = readSrc(file);
      expect(content).toContain('safeRedirectPath');
      // The old unsafe pattern must be gone: pushing the param untouched.
      expect(content).not.toMatch(/params\.get\(['"]redirect['"]\)\s*\|\|\s*['"]\/account['"]/);
    }
  });

  it('safe-redirect is dependency-free so browser bundles stay lean', () => {
    const helper = readSrc('lib/safe-redirect.ts');
    expect(helper).not.toMatch(/^import\s/m);
  });
});
