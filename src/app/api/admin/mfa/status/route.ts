import { NextResponse } from 'next/server';
import { requireAdminInProgress } from '@/lib/auth';
import { isAdminMfaRequired } from '@/lib/admin-mfa-policy';

/**
 * GET /api/admin/mfa/status
 *
 * Reports the admin's current MFA assurance level and enrolled TOTP factors,
 * plus the explicit server policy (`required` from ADMIN_MFA_REQUIRED).
 * The login flow only routes to setup/verify when `required` is true —
 * "Supabase supports MFA" never implies "LittleReads requires MFA".
 */
export async function GET() {
  const auth = await requireAdminInProgress();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { supabase } = auth;

  try {
    const { data: assurance } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const { data: factors, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError) throw factorsError;

    const totpFactors = (factors?.all || []).filter(
      (f) => f.factor_type === 'totp'
    );
    // listFactors exposes verified TOTP factors under the `totp` key.
    const verifiedTotpFactors = (factors?.totp || []) as {
      id: string;
      status: string;
      created_at: string;
    }[];

    return NextResponse.json({
      mfaEnabled: true,
      required: isAdminMfaRequired(),
      currentLevel: assurance?.currentLevel || 'aal1',
      nextLevel: assurance?.nextLevel || null,
      factors: totpFactors.map((f) => ({
        id: f.id,
        status: f.status,
        createdAt: f.created_at,
      })),
      needsEnrollment: totpFactors.length === 0,
      needsVerification:
        verifiedTotpFactors.length > 0 &&
        assurance?.currentLevel !== 'aal2',
    });
  } catch {
    // MFA is not enabled in this Supabase project (or auth endpoint failed).
    return NextResponse.json({
      mfaEnabled: false,
      required: isAdminMfaRequired(),
      currentLevel: 'aal1',
      nextLevel: null,
      factors: [],
      needsEnrollment: false,
      needsVerification: false,
    });
  }
}