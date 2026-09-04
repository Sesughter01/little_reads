import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth';
import { z } from 'zod';
import {
  canTransitionOrder,
  isValidOrderStatus,
} from '@/lib/order-status';

const statusSchema = z.object({
  status: z.string().min(1).max(20),
});

/**
 * PATCH /api/admin/orders/[id]/status
 *
 * Updates an order's status only when the transition is allowed by
 * ORDER_STATUS_TRANSITIONS. Arbitrary client-supplied statuses are rejected.
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
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success || !isValidOrderStatus(parsed.data.status)) {
      return NextResponse.json(
        { error: 'Invalid order status' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const from = order.status as Parameters<typeof canTransitionOrder>[0];
    const to = parsed.data.status;

    if (!canTransitionOrder(from, to)) {
      return NextResponse.json(
        {
          error: `Cannot change order from "${from}" to "${to}"`,
        },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: to, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating order status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status: to });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}