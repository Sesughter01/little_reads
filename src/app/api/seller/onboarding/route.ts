import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiRateLimit } from '@/lib/api-rate-limit';

/**
 * POST /api/seller/onboarding — create a PENDING seller application.
 *
 * SECURITY INVARIANTS:
 * - Requires an authenticated session (Supabase server client).
 * - seller_id/owner is derived from the authenticated user — never the body.
 * - status is FORCED to 'pending' server-side; the browser can never set
 *   'approved', 'rejected', or 'suspended'.
 * - approved_by/approved_at are never client-settable.
 * - If a seller profile already exists, the existing status is returned
 *   (idempotent) — never overwritten by client input.
 */
export async function POST(request: NextRequest) {
  const limited = apiRateLimit(request, { key: 'seller-onboarding', limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = userData.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const input = (body ?? {}) as Record<string, unknown>;

  // Validate safe display fields only. Length-bounded, no privileged fields.
  const displayName = typeof input.display_name === 'string' ? input.display_name.trim() : '';
  const businessName = typeof input.business_name === 'string' ? input.business_name.trim() : '';
  const bio = typeof input.bio === 'string' ? input.bio.trim() : '';

  if (displayName.length < 2 || displayName.length > 80) {
    return NextResponse.json({ error: 'Display name must be 2–80 characters' }, { status: 400 });
  }
  if (businessName.length > 120) {
    return NextResponse.json({ error: 'Business name must be at most 120 characters' }, { status: 400 });
  }
  if (bio.length > 1000) {
    return NextResponse.json({ error: 'Bio must be at most 1000 characters' }, { status: 400 });
  }

  // Idempotency: existing profile wins; the client cannot change its status.
  const { data: existing } = await supabase
    .from('seller_profiles')
    .select('user_id, display_name, business_name, bio, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      seller: existing,
      message:
        existing.status === 'pending'
          ? 'Your seller application is under review.'
          : `Your seller account status is: ${existing.status}.`,
    }, { status: 200 });
  }

  // status is hardcoded 'pending'; approved_by/approved_at omitted entirely.
  const insert = {
    user_id: userId,
    display_name: displayName,
    business_name: businessName || null,
    bio: bio || null,
    status: 'pending' as const,
  };

  const { data: created, error: insertError } = await supabase
    .from('seller_profiles')
    .insert(insert)
    .select('user_id, display_name, business_name, bio, status')
    .single();

  if (insertError) {
    // RLS/unique-constraint failures surface as a generic safe error.
    console.error('seller onboarding insert failed:', insertError.code);
    return NextResponse.json({ error: 'Unable to submit seller application' }, { status: 500 });
  }

  return NextResponse.json(
    { seller: created, message: 'Your seller application is under review.' },
    { status: 201 },
  );
}