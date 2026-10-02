import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth';
import type { SellerStatus } from '@/lib/seller';

const VALID_STATUSES: SellerStatus[] = ['pending', 'approved', 'rejected', 'suspended'];

/**
 * GET /api/admin/sellers?status=pending|approved|rejected|suspended
 *
 * Lists seller applications for the admin moderation dashboard, joined with
 * the account holder's name/email so admins can identify applicants. Counts
 * per status always cover ALL applications (unfiltered) so the dashboard
 * chips stay accurate while a filter is active.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const statusParam = request.nextUrl.searchParams.get('status');
    if (statusParam && !VALID_STATUSES.includes(statusParam as SellerStatus)) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    let listQuery = supabase
      .from('seller_profiles')
      .select(
        'user_id, display_name, business_name, bio, status, approved_at, approved_by, created_at, updated_at, profiles!seller_profiles_user_id_fkey(email, first_name, last_name)'
      )
      .order('created_at', { ascending: false });

    if (statusParam) {
      listQuery = listQuery.eq('status', statusParam);
    }

    const [{ data, error }, { data: allRows, error: countError }] = await Promise.all([
      listQuery,
      supabase.from('seller_profiles').select('status'),
    ]);

    if (error || countError) {
      console.error('admin sellers list error:', {
        op: 'admin.listSellers',
        code: error?.code ?? countError?.code,
      });
      return NextResponse.json(
        { error: 'Failed to load seller applications' },
        { status: 500 }
      );
    }

    const counts: Record<SellerStatus, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      suspended: 0,
    };
    for (const row of allRows ?? []) {
      if (VALID_STATUSES.includes(row.status as SellerStatus)) {
        counts[row.status as SellerStatus] += 1;
      }
    }

    return NextResponse.json({ sellers: data ?? [], counts });
  } catch (error) {
    console.error('admin sellers list error:', { op: 'admin.listSellers', error });
    return NextResponse.json(
      { error: 'Failed to load seller applications' },
      { status: 500 }
    );
  }
}
