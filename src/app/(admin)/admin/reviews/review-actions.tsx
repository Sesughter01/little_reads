'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, EyeOff, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export function ReviewActions({
  reviewId,
  status,
}: {
  reviewId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const updateStatus = async (next: 'approved' | 'hidden' | 'pending') => {
    if (next === status) return;
    setBusy(next);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      toast.success(
        next === 'approved'
          ? 'Review approved'
          : next === 'hidden'
            ? 'Review hidden'
            : 'Review set to pending'
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {status !== 'approved' && (
        <button
          type="button"
          onClick={() => updateStatus('approved')}
          disabled={busy !== null}
          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl"
          title="Approve"
        >
          <CheckCircle className="h-4 w-4" />
        </button>
      )}
      {status !== 'hidden' && (
        <button
          type="button"
          onClick={() => updateStatus('hidden')}
          disabled={busy !== null}
          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl"
          title="Hide"
        >
          <EyeOff className="h-4 w-4" />
        </button>
      )}
      {status !== 'pending' && (
        <button
          type="button"
          onClick={() => updateStatus('pending')}
          disabled={busy !== null}
          className="p-2 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded-xl"
          title="Set to pending"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}