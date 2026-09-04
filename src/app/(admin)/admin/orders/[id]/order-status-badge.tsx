'use client';

/**
 * Order status badge — read-only.
 *
 * Order status is payment-system-owned. Admins may only VIEW status here;
 * changes come from Paystack verification (webhook + server reconciliation),
 * not from manual admin edits. There is no PATCH /api/admin/orders/[id]/status
 * endpoint — admin cannot create purchase entitlement simply by changing a
 * status.
 */
export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${status === 'paid'
          ? 'bg-green-100 text-green-700'
          : status === 'pending'
            ? 'bg-yellow-100 text-yellow-700'
          : status === 'failed'
            ? 'bg-red-100 text-red-700'
          : status === 'cancelled'
            ? 'bg-gray-100 text-gray-600'
          : status === 'refunded'
            ? 'bg-purple-100 text-purple-700'
          : 'bg-gray-100 text-gray-600'}
      `}
    >
      {status}
    </span>
  );
}
