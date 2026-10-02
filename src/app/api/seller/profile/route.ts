import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiRateLimit } from '@/lib/api-rate-limit';

/**
 * PUT /api/seller/profile — update SAFE display fields only.
 *
 * status / approved_at / approved_by are never accepted from the client:
 * the server allow-lists display_name, business_name, bio, and the DB
 * trigger (Migration 007) additionally pins status for non-admin writers.
 */
export async function PUT(request: NextRequest) {
  const limited = apiRateLimit(request, { key: 'seller-profile', limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = userData.user.id;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  const businessName = typeof body.business_name === 'string' ? body.business_name.trim() : '';
  const bio = typeof body.bio === 'string' ? body.bio.trim() : '';

  if (displayName.length < 2 || displayName.length > 80) {
    return NextResponse.json({ error: 'Display name must be 2–80 characters' }, { status: 400 });
  }
  if (businessName.length > 120) {
    return NextResponse.json({ error: 'Business name must be at most 120 characters' }, { status: 400 });
  }
  if (bio.length > 1000) {
    return NextResponse.json({ error: 'Bio must be at most 1000 characters' }, { status: 400 });
  }

  // Explicitly privileged fields are rejected if smuggled in the body —
  // the server never reads them, and the trigger would pin them anyway.
  if ('status' in body || 'approved_at' in body || 'approved_by' in body || 'user_id' in body) {
    return NextResponse.json({ error: 'Privileged fields cannot be changed here' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('seller_profiles')
    .update({
      display_name: displayName,
      business_name: businessName || null,
      bio: bio || null,
    })
    .eq('user_id', userId)
    .select('user_id, display_name, business_name, bio, status')
    .maybeSingle();

  if (error) {
    console.error('seller profile update failed:', error.code);
    return NextResponse.json({ error: 'Unable to update seller profile' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, seller: data });
}
