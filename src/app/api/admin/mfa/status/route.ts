import { NextResponse } from 'next/server';
import { requireAdminInProgress } from '@/lib/auth';

/**
 * GET /api/admin/mfa/status
 *
 * Reports the admin's current MFA assurance level and enrolled TOTP factors.
 * Used by the admin login flow to decide where to send the admin next
 * (setup / verify / dashboard) and by the MFA pages themselves.
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
      currentLevel: 'aal1',
      nextLevel: null,
      factors: [],
      needsEnrollment: false,
      needsVerification: false,
    });
  }
}