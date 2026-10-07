import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  isAdminMfaRequired,
  resolveAdminMfaNext,
} from '@/lib/admin-mfa-policy';

const readSrc = (relative: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf-8');

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isAdminMfaRequired', () => {
  it('defaults to false when unset', () => {
    vi.stubEnv('ADMIN_MFA_REQUIRED', '');
    delete process.env.ADMIN_MFA_REQUIRED;
    expect(isAdminMfaRequired()).toBe(false);
  });

  it('is true only for exactly "true"', () => {
    vi.stubEnv('ADMIN_MFA_REQUIRED', 'true');
    expect(isAdminMfaRequired()).toBe(true);
    vi.stubEnv('ADMIN_MFA_REQUIRED', '1');
    expect(isAdminMfaRequired()).toBe(false);
    vi.stubEnv('ADMIN_MFA_REQUIRED', 'TRUE');
    expect(isAdminMfaRequired()).toBe(false);
  });

  it('never reads a NEXT_PUBLIC_ flag', () => {
    const policy = readSrc('lib/admin-mfa-policy.ts');
    expect(policy).not.toContain('process.env.NEXT_PUBLIC');
  });
});

describe('resolveAdminMfaNext', () => {
  it('ADMIN_MFA_REQUIRED=false: admin without factor enters admin', () => {
    expect(
      resolveAdminMfaNext(
        { mfaEnabled: true, needsEnrollment: true, needsVerification: false, currentLevel: 'aal1' },
        false
      )
    ).toBe('/admin');
  });

  it('ADMIN_MFA_REQUIRED=false: verified-but-aal1 still enters admin', () => {
    expect(
      resolveAdminMfaNext(
        { mfaEnabled: true, needsEnrollment: false, needsVerification: true, currentLevel: 'aal1' },
        false
      )
    ).toBe('/admin');
  });

  it('ADMIN_MFA_REQUIRED=true: no factor → setup', () => {
    expect(
      resolveAdminMfaNext(
        { mfaEnabled: true, needsEnrollment: true, needsVerification: false, currentLevel: 'aal1' },
        true
      )
    ).toBe('/admin/mfa/setup');
  });

  it('ADMIN_MFA_REQUIRED=true: verified factor at aal1 → verify', () => {
    expect(
      resolveAdminMfaNext(
        { mfaEnabled: true, needsEnrollment: false, needsVerification: true, currentLevel: 'aal1' },
        true
      )
    ).toBe('/admin/mfa/verify');
  });

  it('ADMIN_MFA_REQUIRED=true: aal2 → dashboard', () => {
    expect(
      resolveAdminMfaNext(
        { mfaEnabled: true, needsEnrollment: false, needsVerification: false, currentLevel: 'aal2' },
        true
      )
    ).toBe('/admin');
  });
});

describe('server + login wiring respects the flag', () => {
  it('status API reports the policy flag', () => {
    const route = readSrc('app/api/admin/mfa/status/route.ts');
    expect(route).toContain('isAdminMfaRequired()');
    expect(route).toContain('required:');
  });

  it('login only routes to MFA when required', () => {
    const login = readSrc('app/(admin-auth)/admin/login/admin-login-client.tsx');
    expect(login).toContain('mfa.required');
  });

  it('guards skip MFA when the flag is off, role stays mandatory', () => {
    const auth = readSrc('lib/auth.ts');
    expect(auth).toContain('isAdminMfaRequired()');
    // Role verification is untouched by the flag.
    expect(auth).toContain("profile.role !== 'admin'");
  });

  it('admin login no longer claims mandatory TOTP protection', () => {
    const login = readSrc('app/(admin-auth)/admin/login/admin-login-client.tsx');
    expect(login).not.toContain('Protected by role verification and two-factor authentication (TOTP)');
  });
});

describe('page-guard enrollment enforcement (requireAdmin)', () => {
  it('required + no verified factor → setup; verified + aal1 → verify', () => {
    const auth = readSrc('lib/auth.ts');
    expect(auth).toContain("destination = '/admin/mfa/setup'");
    expect(auth).toContain("destination = '/admin/mfa/verify'");
    expect(auth).toContain('redirect(destination)');
    // Enrollment is enforced inside the flag gate, after the role check.
    const setupIdx = auth.indexOf("destination = '/admin/mfa/setup'");
    const roleIdx = auth.indexOf("profile.role !== 'admin'");
    expect(roleIdx).toBeGreaterThanOrEqual(0);
    expect(setupIdx).toBeGreaterThan(roleIdx);
  });

  it('MFA pages cannot loop: they authenticate via requireAdminInProgress', () => {
    const auth = readSrc('lib/auth.ts');
    // requireAdmin (full) is never referenced by the MFA setup/verify flow;
    // only the progress guard is, which skips MFA by design.
    expect(auth).toContain('requireAdminInProgress');
  });
});
