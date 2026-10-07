import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { isSafeRedirectPath } from '@/lib/safe-redirect';

const readSrc = (relative: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf-8');

describe('admin recovery flow', () => {
  it('admin login exposes a forgot-password entry that preserves admin intent', () => {
    const login = readSrc('app/(admin-auth)/admin/login/admin-login-client.tsx');
    expect(login).toContain('/forgot-password?admin=1');
    expect(login).toContain('Forgot password?');
  });

  it('forgot-password threads admin intent into the recovery callback', () => {
    const forgot = readSrc('app/(auth)/forgot-password/forgot-password-client.tsx');
    expect(forgot).toContain("'/reset-password?admin=1'");
    expect(forgot).toContain('isAdmin');
  });

  it('auth callback preserves the validated reset target including ?admin=1', () => {
    const callback = readSrc('app/auth/callback/route.ts');
    expect(callback).toContain('requestedNextPath');
    expect(callback).toContain('resetTarget');
    // Admin recovery still counts as recovery (path comparison, not exact match).
    expect(callback).toContain("'/reset-password'");
  });

  it('reset page returns customers to /login and admins to /admin/login', () => {
    const reset = readSrc('app/(auth)/reset-password/reset-password-client.tsx');
    expect(reset).toContain("'/admin/login?reset=1'");
    expect(reset).toContain("'/login?reset=1'");
    expect(reset).toContain("'/forgot-password?admin=1'");
  });

  it('admin recovery never touches roles (password change only)', () => {
    const reset = readSrc('app/(auth)/reset-password/reset-password-client.tsx');
    expect(reset).not.toMatch(/profiles.*role|role.*admin/i);
    expect(reset).toContain('auth.updateUser({ password })');
    expect(reset).toContain('auth.signOut()');
  });

  it('unsafe return destinations are still rejected', () => {
    expect(isSafeRedirectPath('https://evil.example')).toBe(false);
    expect(isSafeRedirectPath('/login')).toBe(false);
    expect(isSafeRedirectPath('/account')).toBe(true);
  });

  it('only the exact admin=1 value selects the admin flow', () => {
    const page = readSrc('app/(auth)/forgot-password/page.tsx');
    expect(page).toContain("params.admin === '1'");
  });
});
