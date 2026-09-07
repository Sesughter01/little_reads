import { NextRequest, NextResponse } from 'next/server';

/**
 * GET/PATCH /api/admin/orders/[id]/status
 *
 * Order status is payment-system-owned. Admins may VIEW status via the order
 * detail page, but status changes come ONLY from Paystack verification
 * (webhook + server reconciliation via fulfillPaidOrder). There is no manual
 * admin status mutation.
 *
 * PATCH requests are rejected so that an admin (or anyone else) cannot grant
 * purchase entitlement simply by setting status = 'paid'.
 */
export async function PATCH(
  _request: NextRequest,
  _params: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: 'Order status is payment-system-owned. Manual status changes are not allowed.' },
    { status: 405 }
  );
}

/** Status is readable via the order detail/list pages — no separate GET here. */
export async function GET(_request: NextRequest, _params: { params: Promise<{ id: string }> }) {
  return NextResponse.json(
    { error: 'Use /admin/orders/[id] to view order status.', ok: false },
    { status: 404 }
  );
}
