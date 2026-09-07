'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ORDER_STATUSES } from '@/lib/order-status';
import toast from 'react-hot-toast';

export function OrderStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next === currentStatus) return;

    if (!window.confirm(`Change order status from "${currentStatus}" to "${next}"?`)) {
      e.target.value = currentStatus;
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update status');
        e.target.value = currentStatus;
        return;
      }
      toast.success(`Order marked as ${next}`);
      router.refresh();
    } catch {
      toast.error('Failed to update status');
      e.target.value = currentStatus;
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={isUpdating}
      className="input text-sm py-1.5 px-3 rounded-xl border border-gray-200 bg-white"
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}