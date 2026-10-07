/**
 * Explicit server-controlled admin MFA policy.
 *
 * ADMIN_MFA_REQUIRED is a SERVER-ONLY flag (never NEXT_PUBLIC_).
 *   'true'  → MFA enrollment/verification is enforced for admins.
 *   anything else / unset → optional: password login works normally.
 *
 * MFA is always an additional authentication factor, never authorization:
 * admin privileges still require profiles.role === 'admin' regardless of
 * this flag.
 */

export type MfaAssuranceLevel = 'aal1' | 'aal2';

export type AdminMfaDecision = '/admin' | '/admin/mfa/setup' | '/admin/mfa/verify';

export type AdminMfaState = {
  mfaEnabled: boolean;
  needsEnrollment: boolean;
  needsVerification: boolean;
  currentLevel: MfaAssuranceLevel;
};

/** Server-only: read the policy flag. Never expose via NEXT_PUBLIC_. */
export function isAdminMfaRequired(): boolean {
  return process.env.ADMIN_MFA_REQUIRED === 'true';
}

/**
 * Pure routing decision for an authenticated admin.
 * When not required → always dashboard (no forced enrollment/verification).
 * When required → no factor → setup; verified factor but aal1 → verify;
 * aal2 → dashboard.
 */
export function resolveAdminMfaNext(
  state: AdminMfaState,
  required: boolean
): AdminMfaDecision {
  if (!required) return '/admin';
  if (!state.mfaEnabled) return '/admin';
  if (state.needsEnrollment) return '/admin/mfa/setup';
  if (state.needsVerification || state.currentLevel !== 'aal2') {
    return '/admin/mfa/verify';
  }
  return '/admin';
}
