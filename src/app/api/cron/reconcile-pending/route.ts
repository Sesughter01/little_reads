import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
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

  // Constant-time comparison: a plain string compare leaks the secret one
  // byte at a time to a timing oracle. Length-guard first so timingSafeEqual
  // cannot throw on a malformed header.
  const auth = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(auth);
  const b = Buffer.from(expected);
  const mismatch = a.length !== b.length || !crypto.timingSafeEqual(a, b);
  if (mismatch) {
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