'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

/**
 * "Check Payment Status" — lets the order owner re-run server-side Paystack
 * reconciliation if the webhook/callback never fulfilled the order. The API
 * only ever verifies the STORED reference for the authenticated owner.
 */
export function CheckPaymentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [state, setState] = useState<
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'done'; message: string }
    | { phase: 'error'; message: string }
  >({ phase: 'idle' });

  async function handleCheck() {
    setState({ phase: 'loading' });
    try {
      const response = await fetch(`/api/orders/${orderId}/reconcile`, {
        method: 'POST',
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.ok) {
        setState({
          phase: 'done',
          message:
            data.code === 'FULFILLED' || data.code === 'ALREADY_FULFILLED'
              ? 'Payment confirmed — your books are now in your library.'
              : (data.message ?? 'Payment confirmed.'),
        });
        // Re-render this server page so the order badge updates.
        router.refresh();
      } else {
        setState({
          phase: 'error',
          message:
            data.message ??
            'We could not confirm the payment right now. Please try again shortly.',
        });
      }
    } catch {
      setState({
        phase: 'error',
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  return (
    <div className="mt-4">
      {state.phase === 'idle' && (
        <button
          type="button"
          onClick={handleCheck}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-purple hover:text-purple-700 underline-offset-2 hover:underline"
        >
          <RefreshCw className="h-4 w-4" />
          Check Payment Status
        </button>
      )}

      {state.phase === 'loading' && (
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 cursor-wait"
        >
          <RefreshCw className="h-4 w-4 animate-spin" />
          Checking with Paystack…
        </button>
      )}

      {state.phase === 'done' && (
        <p className="inline-flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {state.message}
        </p>
      )}

      {state.phase === 'error' && (
        <p className="inline-flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          {state.message}
        </p>
      )}
    </div>
  );
}
