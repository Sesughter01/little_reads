import { NextResponse } from 'next/server';
import { requireAdminInProgress } from '@/lib/auth';

/**
 * POST /api/admin/mfa/enroll
 *
 * Enrolls a new TOTP factor for the authenticated admin. Returns the factor id
 * plus the otpauth URI / QR code so the admin can scan it with an authenticator
 * app. The factor only becomes active after POST /api/admin/mfa/verify confirms
 * a valid 6-digit code.
 */
export async function POST() {
  const auth = await requireAdminInProgress();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { supabase } = auth;

  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (error) throw error;

    return NextResponse.json({
      factorId: data.id,
      totp: {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to enable MFA';
    // Don't leak raw infrastructure details to the browser.
    const safeMessage = message.toLowerCase().includes('mfa')
      ? 'MFA is not enabled for this project. Enable it in the Supabase dashboard (Authentication → Multi-factor authentication).'
      : 'Failed to enable MFA. Please try again.';
    return NextResponse.json({ error: safeMessage }, { status: 400 });
  }
}