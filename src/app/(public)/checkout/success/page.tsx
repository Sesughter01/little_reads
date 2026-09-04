import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle, ArrowRight, Library, AlertTriangle, Loader2 } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { fulfillPaidOrder } from '@/lib/fulfillment';

export const dynamic = 'force-dynamic';

type Result =
  | { state: 'fulfilled'; ref: string; created: number }
  | { state: 'no-ref' }
  | { state: 'processing'; ref: string }
  | { state: 'failed'; ref: string; message: string }
  | { state: 'not-found'; ref: string }
  | { state: 'not-yours'; ref: string };

async function reconcile(ref: string, userId: string): Promise<Result> {
  const serviceClient = await createServiceClient();

  // Find the order server-side; verify this authenticated user owns it.
  const { data: order, error } = await serviceClient
    .from('orders')
    .select('id, user_id, status, total, paystack_reference')
    .eq('paystack_reference', ref)
    .maybeSingle();

  if (error || !order) {
    return { state: 'not-found', ref };
  }
  if (!order.user_id || order.user_id !== userId) {
    // Never show another account's order as this user's purchase.
    return { state: 'not-yours', ref };
  }

  // The webhook may already have marked the order paid — but paid alone does
  // not mean purchases exist. Reconcile with the SAME idempotent helper.
  // (Library/order/admin pages are all force-dynamic, so they read fresh
  // data on every request — no manual cache revalidation needed.)
  const result = await fulfillPaidOrder(ref);

  if (!result.ok) {
    // Order exists and belongs to this user, but fulfillment could not be
    // completed right now (e.g. Paystack verify in flight). Offer retry.
    return {
      state: 'processing',
      ref,
    };
  }

  return { state: 'fulfilled', ref, created: result.purchasesCreated };
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  if (!ref) {
    return <SuccessShell result={{ state: 'no-ref' }} />;
  }

  // Success UI must never be trusted on its own — reconcile server-side with
  // the authenticated user's session.
  const { userId } = await requireUser();
  const result = await reconcile(ref, userId);

  return <SuccessShell result={result} />;
}

function SuccessShell({ result }: { result: Result }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      {result.state === 'fulfilled' && (
        <>
          <CheckCircle className="h-20 w-20 text-brand-green mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>
          <p className="text-gray-500 mb-4">
            Thank you for your purchase. Your books are now in your library.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Order Reference: <span className="font-mono">{result.ref}</span>
          </p>
          <div className="bg-gray-50 rounded-2xl p-6 mb-8">
            <p className="text-sm text-gray-500 mb-2">What&apos;s next?</p>
            <p className="text-gray-700">
              Your purchased ebooks are available in your library. You can
              download and read them anytime.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/account/library" className="btn-primary">
              <Library className="h-4 w-4 mr-2" />
              Go to My Library
            </Link>
            <Link href="/shop" className="btn-secondary">
              Continue Shopping
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        </>
      )}

      {result.state === 'processing' && (
        <>
          <Loader2 className="h-20 w-20 text-amber-500 animate-spin mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            We&apos;re Confirming Your Payment
          </h1>
          <p className="text-gray-500 mb-4">
            Your payment may still be processing. This usually resolves within
            a few seconds — refresh this page or check your library shortly.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Reference: <span className="font-mono">{result.ref}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/checkout/success?ref=${result.ref}`} className="btn-primary">
              Check Again
            </Link>
            <Link href="/account/orders" className="btn-secondary">
              View Orders
            </Link>
          </div>
        </>
      )}

      {result.state === 'no-ref' && (
        <>
          <AlertTriangle className="h-20 w-20 text-amber-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            We could not confirm your payment
          </h1>
          <p className="text-gray-500 mb-8">
            No payment reference was provided. If you were redirected here
            after paying, go to your orders to check the status.
          </p>
          <Link href="/account/orders" className="btn-primary">
            View Orders
          </Link>
        </>
      )}

      {result.state === 'not-found' && (
        <>
          <AlertTriangle className="h-20 w-20 text-amber-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Order Not Found
          </h1>
          <p className="text-gray-500 mb-8">
            We could not find an order with that reference. If you were charged,
            please contact support with your Paystack reference.
          </p>
          <Link href="/account/orders" className="btn-primary">
            View Orders
          </Link>
        </>
      )}

      {result.state === 'not-yours' && (
        <>
          <AlertTriangle className="h-20 w-20 text-red-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Order Does Not Belong to This Account
          </h1>
          <p className="text-gray-500 mb-8">
            This order is linked to a different account. Sign in with the
            account that placed the order to see it.
          </p>
          <Link href="/account" className="btn-primary">
            Go to My Account
          </Link>
        </>
      )}

      {result.state === 'failed' && (
        <>
          <AlertTriangle className="h-20 w-20 text-red-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Could Not Be Confirmed
          </h1>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            {result.message}
          </p>
          <Link href="/account/orders" className="btn-primary">
            View Orders
          </Link>
        </>
      )}
    </div>
  );
}
