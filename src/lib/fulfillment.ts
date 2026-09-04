import { createServiceClient } from '@/lib/supabase/server';
import { verifyPaystackTransaction } from '@/lib/paystack';

/**
 * Mask a Paystack reference for safe server logs — never log full
 * transaction references.
 */
export function maskReference(ref: string | null | undefined): string {
  if (!ref) return '(none)';
  if (ref.length <= 10) return `${ref.slice(0, 2)}…`;
  return `${ref.slice(0, 3)}…${ref.slice(-4)}`;
}

export type FulfillmentResult = {
  ok: boolean;
  /** HTTP-ish status the caller should reflect (200 = processed, 500 = retry). */
  status: number;
  orderStatus: string | null;
  orderMarkedPaid: boolean;
  purchasesCreated: number;
  purchasesAlreadyExisting: number;
  message: string;
  /** Safe diagnostic code, never secrets/credentials. */
  code:
    | 'ORDER_NOT_FOUND'
    | 'PAYSTACK_VERIFY_FAILED'
    | 'NOT_PAID'
    | 'AMOUNT_MISMATCH'
    | 'CURRENCY_MISMATCH'
    | 'ORDER_MARKED_PAID'
    | 'ORDER_ALREADY_PAID'
    | 'NO_USER'
    | 'ORDER_ITEMS_ERROR'
    | 'PURCHASE_INSERT_ERROR'
    | 'FULFILLED'
    | 'ALREADY_FULFILLED'
    | 'ORDER_LOOKUP_ERROR';
};

/**
 * ONE idempotent fulfillment path for a paid Paystack order.
 *
 * Used by BOTH the Paystack webhook and the server-side return reconciliation
 * on /checkout/success. Calling it repeatedly is safe:
 *
 *   1. find the order by its Paystack reference
 *   2. verify the transaction with Paystack (status, reference, amount, NGN)
 *   3. mark the order paid if it isn't already (never trusts "paid" alone)
 *   4. load ALL order items
 *   5. ensure a purchase row exists for every item (repairs partially
 *      fulfilled orders; never duplicates thanks to existing-row checks and
 *      the unique (user_id, product_id) constraint)
 *
 * order.status === 'paid' is NOT treated as "fulfillment complete" — a payment
 * can be marked paid while purchase creation failed afterwards, and a webhook
 * retry must repair that rather than short-circuit.
 */
export async function fulfillPaidOrder(
  reference: string
): Promise<FulfillmentResult> {
  const fail = (result: Omit<FulfillmentResult, 'ok' | 'status'>): FulfillmentResult => ({
    ...result,
    ok: false,
    status: 500,
  });

  try {
    const supabase = await createServiceClient();

    // ── 1. Find the order ─────────────────────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('paystack_reference', reference)
      .maybeSingle();

    if (orderError) {
      console.error('fulfillment: order lookup error', {
        code: 'ORDER_LOOKUP_ERROR',
        dbCode: orderError.code,
      });
      return fail({ orderStatus: null, orderMarkedPaid: false, purchasesCreated: 0, purchasesAlreadyExisting: 0, message: 'Order lookup failed', code: 'ORDER_LOOKUP_ERROR' });
    }
    if (!order) {
      return fail({ orderStatus: null, orderMarkedPaid: false, purchasesCreated: 0, purchasesAlreadyExisting: 0, message: 'Order not found', code: 'ORDER_NOT_FOUND' });
    }

    // ── 2. Verify the Paystack transaction server-side ────────────────
    const verification = await verifyPaystackTransaction(reference);

    if (!verification.status) {
      console.error('fulfillment: paystack verify failed', {
        code: 'PAYSTACK_VERIFY_FAILED',
        message: verification.message,
      });
      return fail({ orderStatus: order.status, orderMarkedPaid: false, purchasesCreated: 0, purchasesAlreadyExisting: 0, message: verification.message || 'Payment verification failed', code: 'PAYSTACK_VERIFY_FAILED' });
    }

    if (verification.data.status !== 'success') {
      // Payment did not actually succeed (e.g. abandoned/failed) — not an
      // infra error, but never fulfill. Return 200 so Paystack stops retrying.
      return {
        ok: false,
        status: 200,
        orderStatus: order.status,
        orderMarkedPaid: false,
        purchasesCreated: 0,
        purchasesAlreadyExisting: 0,
        message: `Payment status is ${verification.data.status}, not success`,
        code: 'NOT_PAID',
      };
    }

    const expectedAmount = Math.round(order.total * 100); // Naira → kobo
    if (verification.data.amount !== expectedAmount) {
      console.error('fulfillment: amount mismatch', {
        code: 'AMOUNT_MISMATCH',
        paid: verification.data.amount,
        expected: expectedAmount,
      });
      return {
        ok: false,
        status: 200, // permanent mismatch — no point retrying via Paystack
        orderStatus: order.status,
        orderMarkedPaid: false,
        purchasesCreated: 0,
        purchasesAlreadyExisting: 0,
        message: 'Payment amount does not match the order total',
        code: 'AMOUNT_MISMATCH',
      };
    }

    if (verification.data.currency !== 'NGN') {
      console.error('fulfillment: currency mismatch', {
        code: 'CURRENCY_MISMATCH',
        currency: verification.data.currency,
      });
      return {
        ok: false,
        status: 200,
        orderStatus: order.status,
        orderMarkedPaid: false,
        purchasesCreated: 0,
        purchasesAlreadyExisting: 0,
        message: 'Payment currency is not NGN',
        code: 'CURRENCY_MISMATCH',
      };
    }

    // ── 3. Mark the order paid (idempotent) ───────────────────────────
    let orderMarkedPaid = false;
    if (order.status !== 'paid') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_channel: verification.data.channel || order.payment_channel || null,
          paid_at:
            verification.data.paid_at || order.paid_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('fulfillment: order update error', {
          code: 'ORDER_LOOKUP_ERROR',
          dbCode: updateError.code,
        });
        return fail({ orderStatus: order.status, orderMarkedPaid: false, purchasesCreated: 0, purchasesAlreadyExisting: 0, message: 'Failed to mark order paid', code: 'ORDER_LOOKUP_ERROR' });
      }
      orderMarkedPaid = true;
    }

    // If the order has no owning user there is nothing to grant access to;
    // still consider the payment side fulfilled.
    if (!order.user_id) {
      return {
        ok: true,
        status: 200,
        orderStatus: 'paid',
        orderMarkedPaid,
        purchasesCreated: 0,
        purchasesAlreadyExisting: 0,
        message: orderMarkedPaid
          ? 'Order marked paid (no user attached — no library access granted)'
          : 'Order already paid (no user attached — nothing to grant)',
        code: orderMarkedPaid ? 'ORDER_MARKED_PAID' : 'ORDER_ALREADY_PAID',
      };
    }

    // ── 4. Load ALL order items ───────────────────────────────────────
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id')
      .eq('order_id', order.id);

    if (itemsError || !orderItems) {
      console.error('fulfillment: order items lookup error', {
        code: 'ORDER_ITEMS_ERROR',
        dbCode: itemsError?.code,
      });
      return fail({ orderStatus: 'paid', orderMarkedPaid, purchasesCreated: 0, purchasesAlreadyExisting: 0, message: 'Failed to load order items', code: 'ORDER_ITEMS_ERROR' });
    }

    // ── 5. Ensure a purchase row per item (repair / never duplicate) ──
    let purchasesCreated = 0;
    let purchasesAlreadyExisting = 0;

    for (const item of orderItems) {
      if (!item.product_id) continue;

      // Existing-row check first (fast path, avoids most constraint races).
      const { data: existing } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', order.user_id)
        .eq('product_id', item.product_id)
        .maybeSingle();

      if (existing) {
        purchasesAlreadyExisting += 1;
        continue;
      }

      const { error: insertError } = await supabase.from('purchases').insert({
        user_id: order.user_id,
        product_id: item.product_id,
        order_id: order.id,
      });

      if (insertError) {
        // Unique (user_id, product_id) race — another fulfillment attempt
        // created it between our check and insert. That's a success, not an
        // error.
        if (insertError.code === '23505') {
          purchasesAlreadyExisting += 1;
          continue;
        }
        console.error('fulfillment: purchase insert error', {
          code: 'PURCHASE_INSERT_ERROR',
          dbCode: insertError.code,
        });
        return fail({ orderStatus: 'paid', orderMarkedPaid, purchasesCreated, purchasesAlreadyExisting, message: 'Failed to create purchase access', code: 'PURCHASE_INSERT_ERROR' });
      }
      purchasesCreated += 1;
    }

    const alreadyPaid = !orderMarkedPaid;
    return {
      ok: true,
      status: 200,
      orderStatus: 'paid',
      orderMarkedPaid,
      purchasesCreated,
      purchasesAlreadyExisting,
      message: alreadyPaid
        ? 'Order was already paid; missing purchases repaired'
        : 'Order marked paid and purchases created',
      code: alreadyPaid ? 'ALREADY_FULFILLED' : 'FULFILLED',
    };
  } catch (error) {
    console.error('fulfillment: unexpected error', { code: 'FULFILLMENT_ERROR', error });
    return fail({ orderStatus: null, orderMarkedPaid: false, purchasesCreated: 0, purchasesAlreadyExisting: 0, message: 'Fulfillment failed', code: 'ORDER_LOOKUP_ERROR' });
  }
}
