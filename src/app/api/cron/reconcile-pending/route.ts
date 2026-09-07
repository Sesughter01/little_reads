import { NextRequest, NextResponse } from 'next/server';
import { reconcilePendingOrders } from '@/lib/reconcile-pending';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/reconcile-pending
 *
 * Vercel Cron entry point for the pending-order fulfillment sweep (see
 * vercel.json). Runs on a schedule and fulfills any `pending` order whose
 * Paystack transaction actually succeeded — the safety net for payments that
 * never reached the webhook or the return callback.
 *
 * Security: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the
 * CRON_SECRET environment variable is set. If CRON_SECRET is unset the route
 * refuses to run (503) rather than exposing the sweep unauthenticated.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('CRON_SECRET not configured — refusing to run reconcile sweep');
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 503 }
    );
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await reconcilePendingOrders();
    console.log('RECONCILE_SWEEP_COMPLETE', summary);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Reconcile sweep error:', { error });
    return NextResponse.json(
      { error: 'Reconciliation failed' },
      { status: 500 }
    );
  }
}