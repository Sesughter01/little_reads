import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/paystack';
import { fulfillPaidOrder } from '@/lib/fulfillment';

/**
 * Paystack webhook.
 *
 * Signature verification uses HMAC-SHA512 of the raw request body signed with
 * PAYSTACK_SECRET_KEY (x-paystack-signature header). Forged signatures are
 * rejected before any order state is touched.
 *
 * Fulfillment is delegated to the single idempotent fulfillPaidOrder helper
 * shared with the /checkout/success return-reconciliation path. An order that
 * is already `paid` is NOT short-circuited: if its purchases are missing
 * (partial fulfillment), a retry repairs them.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    // FAIL SECURELY: Reject if secret key is not configured
    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error('CRITICAL: PAYSTACK_SECRET_KEY not configured. Rejecting webhook.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify webhook signature (mandatory)
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature received');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event !== 'charge.success') {
      // Non-charge events are acknowledged but not acted on.
      return NextResponse.json({ message: 'Event ignored' });
    }

    const reference: string | undefined = event.data?.reference;
    if (!reference) {
      console.error('Webhook charge.success missing reference');
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    const result = await fulfillPaidOrder(reference);

    if (!result.ok) {
      // Not-fulfilled states (verification/DB/purchase failures) return 500 so
      // Paystack retries the webhook. Permanent mismatches return non-500.
      return NextResponse.json(
        { error: result.message },
        { status: result.status >= 500 ? 500 : result.status }
      );
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
