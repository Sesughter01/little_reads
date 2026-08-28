import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyPaystackTransaction } from '@/lib/paystack';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    // FAIL SECURELY: Reject if webhook secret is not configured
    if (!process.env.PAYSTACK_WEBHOOK_SECRET) {
      console.error('CRITICAL: PAYSTACK_WEBHOOK_SECRET not configured. Rejecting webhook.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify webhook signature (mandatory)
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      console.error('Invalid webhook signature received');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const supabase = await createServiceClient();

    if (event.event === 'charge.success') {
      const { reference, amount, status, channel, paid_at } = event.data;

      // Find the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('paystack_reference', reference)
        .single();

      if (orderError || !order) {
        console.error('Order not found for reference:', reference);
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // IDEMPOTENCY: Skip if already paid
      if (order.status === 'paid') {
        return NextResponse.json({ message: 'Already processed' });
      }

      // Verify transaction server-side with Paystack API
      const verification = await verifyPaystackTransaction(reference);

      if (!verification.status || verification.data.status !== 'success') {
        await supabase
          .from('orders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', order.id);

        return NextResponse.json({ message: 'Payment verification failed' });
      }

      // VERIFY AMOUNT: Ensure paid amount matches order total
      const expectedAmount = Math.round(order.total * 100); // Naira to kobo
      if (verification.data.amount !== expectedAmount) {
        console.error('Amount mismatch:', verification.data.amount, 'vs', expectedAmount);
        await supabase
          .from('orders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', order.id);

        return NextResponse.json({ message: 'Amount mismatch' });
      }

      // VERIFY CURRENCY
      if (verification.data.currency !== 'NGN') {
        console.error('Currency mismatch:', verification.data.currency);
        await supabase
          .from('orders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', order.id);

        return NextResponse.json({ message: 'Currency mismatch' });
      }

      // Mark order as paid
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_channel: channel,
          paid_at: paid_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // Create purchase access records (idempotent)
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order_id', order.id);

      if (orderItems && order.user_id) {
        for (const item of orderItems) {
          // Check if purchase already exists (idempotency)
          const { data: existing } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_id', order.user_id)
            .eq('product_id', item.product_id)
            .single();

          if (!existing) {
            await supabase.from('purchases').insert({
              user_id: order.user_id,
              product_id: item.product_id,
              order_id: order.id,
            });
          }
        }
      }
    }

    return NextResponse.json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
