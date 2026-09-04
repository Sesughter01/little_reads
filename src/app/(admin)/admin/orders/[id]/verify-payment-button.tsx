'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2 } from 'lucide-react';

/**
 * Admin "Verify with Paystack" — calls the admin reconcile API, which NEVER
 * sets status=paid directly: it verifies the stored Paystack reference and
 * funnels through the shared fulfillPaidOrder helper.
 */
export function VerifyPaymentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [state, setState] = useState<
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'done'; message: string }
    | { phase: 'error'; message: string }
  >({ phase: 'idle' });

  async function handleVerify() {
    setState({ phase: 'loading' });
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/reconcile`, {
        method: 'POST',
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.ok) {
        setState({
          phase: 'done',
          message:
            data.code === 'FULFILLED'
              ? 'Verified — order marked paid and purchases created.'
              : data.code === 'ALREADY_FULFILLED'
                ? 'Verified — order was already paid; purchases confirmed/repairing.'
                : (data.message ?? 'Verified with Paystack.'),
        });
        router.refresh();
      } else {
        setState({
          phase: 'error',
          message:
            data.message ??
            'Verification failed. Check the Paystack reference and try again.',
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
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleVerify}
        disabled={state.phase === 'loading'}
        className="inline-flex items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-900 disabled:opacity-60 disabled:cursor-wait"
      >
        {state.phase === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        Verify with Paystack
      </button>

      {state.phase === 'done' && (
        <p className="text-xs text-green-700 bg-green-50 rounded-md px-2 py-1">
          {state.message}
        </p>
      )}
      {state.phase === 'error' && (
        <p className="text-xs text-red-600 bg-red-50 rounded-md px-2 py-1">
          {state.message}
        </p>
      )}
    </div>
  );
}
