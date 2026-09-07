/**
 * Safe reconciliation policy decisions for paid-but-unfulfilled orders.
 *
 * Kept as pure functions so the authorization matrix is unit-testable without
 * a database: only the owning customer (or an admin) may trigger a Paystack
 * re-verification of an order, and only orders that carry a Paystack
 * reference are eligible. Every path below funnels into the single
 * fulfillPaidOrder helper — there is deliberately no second fulfillment
 * implementation.
 */

export type ReconcileOrderShape = {
  user_id: string | null;
  paystack_reference: string | null;
  status: string;
};

export type CustomerReconcileDecision =
  | { allow: true; order: ReconcileOrderShape }
  | { allow: false; status: number; code: string; message: string };

/**
 * Decide whether an authenticated customer may reconcile an order.
 *
 *  - missing order                → 404 not found
 *  - order owned by another user  → 403 denied (never reveals existence)
 *  - no Paystack reference        → 400 nothing to verify
 *  - otherwise                    → allow (pending AND paid orders are both
 *    eligible: paid-but-unfulfilled orders are repaired by fulfillPaidOrder)
 */
export function evaluateCustomerReconcile(
  order: ReconcileOrderShape | null,
  authUserId: string
): CustomerReconcileDecision {
  if (!order) {
    return {
      allow: false,
      status: 404,
      code: 'ORDER_NOT_FOUND',
      message: 'Order not found.',
    };
  }
  if (!order.user_id || order.user_id !== authUserId) {
    return {
      allow: false,
      status: 403,
      code: 'ORDER_NOT_YOURS',
      message: 'This order does not belong to your account.',
    };
  }
  if (!order.paystack_reference) {
    return {
      allow: false,
      status: 400,
      code: 'NO_PAYSTACK_REFERENCE',
      message: 'This order has no payment reference to verify.',
    };
  }
  return { allow: true, order };
}

export type AdminReconcileDecision =
  | { allow: true; order: ReconcileOrderShape }
  | { allow: false; status: number; code: string; message: string };

/**
 * Decide whether an admin may reconcile an order against Paystack.
 *
 * Admin authorization itself is enforced separately by requireAdminApi();
 * this only validates that the order exists and carries a reference.
 */
export function evaluateAdminReconcile(
  order: ReconcileOrderShape | null
): AdminReconcileDecision {
  if (!order) {
    return {
      allow: false,
      status: 404,
      code: 'ORDER_NOT_FOUND',
      message: 'Order not found.',
    };
  }
  if (!order.paystack_reference) {
    return {
      allow: false,
      status: 400,
      code: 'NO_PAYSTACK_REFERENCE',
      message: 'This order has no Paystack reference to verify.',
    };
  }
  return { allow: true, order };
}
