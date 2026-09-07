import { NextRequest, NextResponse } from 'next/server';
import { requireAdminInProgress } from '@/lib/auth';
import { z } from 'zod';

const verifySchema = z.object({
  factorId: z.string().min(1),
  code: z
    .string()
    .regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

/**
 * POST /api/admin/mfa/verify
 *
 * Challenges the given TOTP factor and verifies the submitted 6-digit code.
 * On success the session reaches assurance level 2 (aal2).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminInProgress();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid code. Enter the 6-digit code from your authenticator app.' },
      { status: 400 }
    );
  }

  const { factorId, code } = parsed.data;
  const { supabase } = auth;

  try {
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError || !challengeData) {
      return NextResponse.json(
        { error: 'This code has expired or is invalid. Request a new code.' },
        { status: 400 }
      );
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      return NextResponse.json(
        { error: 'Invalid code. Check your authenticator app and try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}