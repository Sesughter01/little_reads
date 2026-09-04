import type { OrderStatus } from '@/types';

/**
 * Allowed order status transitions. Admin status changes are validated
 * against this map server-side — arbitrary client-supplied statuses are
 * rejected.
 */
export const ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  OrderStatus[]
> = {
  pending: ['paid', 'failed', 'cancelled'],
  paid: ['refunded'],
  failed: ['pending', 'paid', 'cancelled'],
  cancelled: ['pending', 'paid'],
  refunded: [],
};

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refunded',
];

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  if (from === to) return true;
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isValidOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(value);
}