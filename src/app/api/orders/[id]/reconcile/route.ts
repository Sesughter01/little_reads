import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { fulfillPaidOrder, maskReference } from '@/lib/fulfillment';
import { evaluateCustomerReconcile } from '@/lib/reconcile-policy';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orders/[id]/reconcile
 *
 * Customer recovery path for a payment that succeeded at Paystack but never
 * reached fulfillment (webhook delivery failed, the return callback was
 * interrupted, or the browser closed before /checkout/success ran).
 *
 * Security: the authenticated user must OWN the order — ownership always
 * comes from the server session, never the browser. The Paystack reference is
 * read from the stored order, the transaction is verified directly with
 * Paystack, and fulfillment reuses the ONE idempotent fulfillPaidOrder helper.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Sign in to check your payment status.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const serviceClient = await createServiceClient();
    const { data: order } = await serviceClient
      .from('orders')
      .select('id, user_id, status, paystack_reference')
      .eq('id', id)
      .maybeSingle();

    const decision = evaluateCustomerReconcile(order, authUser.id);

    if (!decision.allow) {
      return NextResponse.json(
        { error: decision.message, code: decision.code },
        { status: decision.status }
      );
    }

    const reference = decision.order.paystack_reference as string;

    console.log('CHECKOUT_RETURN_RECONCILE', {
      ref: maskReference(reference),
      userId: authUser.id,
    });

    const result = await fulfillPaidOrder(reference);

    console.log('CHECKOUT_RETURN_FULFILLMENT', {
      ref: maskReference(reference),
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
    console.error('Reconcile error:', { op: 'orders.reconcile', error });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
