/**
 * Manual / local runner for the pending-order fulfillment sweep.
 *
 * Finds `pending` orders that carry a Paystack reference, verifies each
 * transaction directly with Paystack, and fulfills the ones that actually
 * succeeded — no webhook or return-callback dependency. Idempotent: safe to
 * run repeatedly.
 *
 * Usage (env loaded from .env.local):
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/reconcile-pending-orders.ts
 */
import { reconcilePendingOrders } from '../src/lib/reconcile-pending';

async function main() {
  const summary = await reconcilePendingOrders();
  console.log('=== PENDING ORDER RECONCILE SWEEP ===');
  console.log(JSON.stringify(summary, null, 2));
}

main().then(() => process.exit(0));