import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth';
import { z } from 'zod';

const moderationSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
});

/**
 * PATCH /api/admin/sellers/[id] — approve/reject/suspend a seller application.
 *
 * `id` is the applicant's profiles.id (seller_profiles.user_id).
 *
 * Moderation invariants:
 *   - status 'approved'  → stamps approved_by = acting admin, approved_at = now
 *   - any other status   → clears approved_* so the columns always mean
 *                          "currently approved by X at Y" (never stale grants)
 *   - self-moderation is refused (mirrors the 007 no-self-approval trigger;
 *     the trigger exempts admins, so the API provides the guard)
 *
 * Approval state is changed ONLY here / by service-role SQL — the browser can
 * never set it (enforced server-side by RLS + trg_seller_application_integrity).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = moderationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid seller status' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { data: existing, error: lookupError } = await supabase
      .from('seller_profiles')
      .select('user_id, status')
      .eq('user_id', id)
      .maybeSingle();

    if (lookupError) {
      console.error('admin seller lookup error:', {
        op: 'admin.moderateSeller.lookup',
        code: lookupError.code,
      });
      return NextResponse.json(
        { error: 'Failed to update seller application' },
        { status: 500 }
      );
    }
    if (!existing) {
      return NextResponse.json({ error: 'Seller application not found' }, { status: 404 });
    }
    if (existing.user_id === auth.userId) {
      return NextResponse.json(
        { error: 'You cannot moderate your own seller application' },
        { status: 403 }
      );
    }

    const nextStatus = parsed.data.status;
    const update: {
      status: 'pending' | 'approved' | 'rejected' | 'suspended';
      approved_at?: string | null;
      approved_by?: string | null;
    } = { status: nextStatus };

    if (nextStatus === 'approved') {
      update.approved_at = new Date().toISOString();
      update.approved_by = auth.userId;
    } else {
      update.approved_at = null;
      update.approved_by = null;
    }

    const { data, error } = await supabase
      .from('seller_profiles')
      .update(update)
      .eq('user_id', id)
      .select('user_id, display_name, status, approved_at, approved_by')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Seller application not found' }, { status: 404 });
      }
      console.error('admin seller moderation error:', {
        op: 'admin.moderateSeller',
        code: error.code,
      });
      return NextResponse.json(
        { error: 'Failed to update seller application' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, seller: data });
  } catch (error) {
    console.error('admin seller moderation error:', { op: 'admin.moderateSeller', error });
    return NextResponse.json(
      { error: 'Failed to update seller application' },
      { status: 500 }
    );
  }
}
