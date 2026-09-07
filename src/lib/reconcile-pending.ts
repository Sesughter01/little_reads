import { createServiceClient } from '@/lib/supabase/server';
import { verifyPaystackTransaction } from '@/lib/paystack';
import { fulfillPaidOrder, maskReference } from '@/lib/fulfillment';

/**
 * Pending-order fulfillment sweep.
 *
 * This is the safety net for the "customer paid but the order stayed pending"
 * failure mode:
 *
 *   Paystack sends receipt ✅
 *   → callback lands on the wrong domain (e.g. a stale NEXT_PUBLIC_SITE_URL)
 *     ❌ and/or the webhook never reaches the app ❌
 *   → order remains `pending` ❌
 *   → fulfillPaidOrder() never runs ❌
 *
 * The sweep closes that loop WITHOUT depending on either the return callback
 * or the webhook: it periodically finds `pending` orders that carry a Paystack
 * reference, verifies each transaction directly with Paystack, and funnels any
 * that actually succeeded into the ONE idempotent fulfillPaidOrder helper
 * (same code the webhook and /checkout/success use). Repeated runs are safe:
 * paid orders are skipped, and fulfillPaidOrder repairs partial fulfillment
 * without ever duplicating purchases.
 *
 * Consumers: /api/cron/reconcile-pending (Vercel Cron, guarded by CRON_SECRET)
 * and scripts/reconcile-pending-orders.ts (manual/local runs).
 */

export type PendingOrderShape = {
  id: string;
  status: string;
  paystack_reference: string | null;
  created_at: string | null;
};

/** A pending order must be at least this old before the sweep touches it. */
export const MIN_ORDER_AGE_MS = 60_000;

/**
 * Pure selection rule: which pending orders are eligible for reconciliation?
 *
 *  - status must still be `pending`
 *  - must carry a Paystack reference (nothing to verify without one)
 *  - must be older than MIN_ORDER_AGE_MS, so a checkout the customer is
 *    actively completing right now is not swept mid-flight (verification is
 *    harmless either way — Paystack only reports success once paid — the age
 *    guard just avoids pointless API calls on brand-new abandoned orders)
 */
export function selectPendingOrdersForReconcile(
  orders: PendingOrderShape[],
  now: number = Date.now()
): PendingOrderShape[] {
  return orders.filter((order) => {
    if (order.status !== 'pending') return false;
    if (!order.paystack_reference) return false;

    const created = order.created_at ? Date.parse(order.created_at) : NaN;
    if (Number.isNaN(created)) return true; // no timestamp — verify it anyway

    return now - created >= MIN_ORDER_AGE_MS;
  });
}

export type ReconcilePendingSummary = {
  scanned: number;
  eligible: number;
  verifiedSuccess: number;
  fulfilled: number;
  skippedNotPaid: number;
  failed: number;
  details: Array<{
    reference: string;
    code: string;
    ok: boolean;
  }>;
};

/**
 * Run the sweep: verify every eligible pending order against Paystack and
 * fulfill the ones that actually succeeded.
 *
 * Sequential (not parallel) on purpose — Paystack rate-limits the verify
 * endpoint, and fulfillPaidOrder re-verifies internally anyway.
 */
export async function reconcilePendingOrders(): Promise<ReconcilePendingSummary> {
  const supabase = await createServiceClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, paystack_reference, created_at')
    .eq('status', 'pending')
    .not('paystack_reference', 'is', null);

  if (error) {
    console.error('reconcile-pending: orders lookup error', {
      dbCode: error.code,
    });
    throw new Error('Failed to load pending orders');
  }

  const eligible = selectPendingOrdersForReconcile(orders ?? []);

  const summary: ReconcilePendingSummary = {
    scanned: (orders ?? []).length,
    eligible: eligible.length,
    verifiedSuccess: 0,
    fulfilled: 0,
    skippedNotPaid: 0,
    failed: 0,
    details: [],
  };

  for (const order of eligible) {
    const reference = order.paystack_reference as string;
    const logRef = maskReference(reference);

    try {
      // Cheap gate first: only spend a full fulfillment cycle on a
      // transaction Paystack actually reports as success.
      const verification = await verifyPaystackTransaction(reference);
      if (!verification.status || verification.data.status !== 'success') {
        summary.skippedNotPaid += 1;
        summary.details.push({ reference: logRef, code: 'NOT_PAID', ok: false });
        console.log('RECONCILE_SWEEP_SKIPPED', { ref: logRef, code: 'NOT_PAID' });
        continue;
      }

      summary.verifiedSuccess += 1;
      console.log('RECONCILE_SWEEP_VERIFIED', {
        ref: logRef,
        status: verification.data.status,
      });

      // Amount/currency/paid checks + order update + purchase creation all
      // live in the shared idempotent helper.
      const result = await fulfillPaidOrder(reference);

      console.log('RECONCILE_SWEEP_FULFILLMENT', {
        ref: logRef,
        ok: result.ok,
        code: result.code,
        orderMarkedPaid: result.orderMarkedPaid,
        purchasesCreated: result.purchasesCreated,
        purchasesAlreadyExisting: result.purchasesAlreadyExisting,
      });

      if (result.ok) {
        summary.fulfilled += 1;
        summary.details.push({ reference: logRef, code: result.code, ok: true });
      } else {
        summary.failed += 1;
        summary.details.push({ reference: logRef, code: result.code, ok: false });
      }
    } catch (error) {
      console.error('RECONCILE_SWEEP_ERROR', { ref: logRef, error });
      summary.failed += 1;
      summary.details.push({
        reference: logRef,
        code: 'SWEEP_ERROR',
        ok: false,
      });
    }
  }

  return summary;
}