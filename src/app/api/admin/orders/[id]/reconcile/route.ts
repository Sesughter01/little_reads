import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { fulfillPaidOrder, maskReference } from '@/lib/fulfillment';
import { evaluateAdminReconcile } from '@/lib/reconcile-policy';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/orders/[id]/reconcile
 *
 * Admin "Verify with Paystack": NEVER sets status=paid directly. It loads the
 * order's stored Paystack reference, verifies the transaction with Paystack,
 * and calls the same idempotent fulfillPaidOrder helper used by the webhook.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    const serviceClient = await createServiceClient();
    const { data: order } = await serviceClient
      .from('orders')
      .select('id, user_id, status, paystack_reference')
      .eq('id', id)
      .maybeSingle();

    const decision = evaluateAdminReconcile(order);

    if (!decision.allow) {
      return NextResponse.json(
        { error: decision.message, code: decision.code },
        { status: decision.status }
      );
    }

    const reference = decision.order.paystack_reference as string;

    const result = await fulfillPaidOrder(reference);

    console.log('ADMIN_ORDER_RECONCILE', {
      ref: maskReference(reference),
      orderId: id,
      code: result.code,
      ok: result.ok,
      orderMarkedPaid: result.orderMarkedPaid,
      purchasesCreated: result.purchasesCreated,
    });

    return NextResponse.json(
      {
        ok: result.ok,
        code: result.code,
        orderStatus: result.orderStatus,
        message: result.message,
        purchasesCreated: result.purchasesCreated,
      },
      { status: result.status >= 500 ? 502 : 200 }
    );
  } catch (error) {
    console.error('Admin reconcile error:', { op: 'admin.orders.reconcile', error });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
