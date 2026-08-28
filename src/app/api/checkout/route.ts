import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { initializePaystackTransaction, generateOrderReference, nairaToKobo } from '@/lib/paystack';
import { z } from 'zod';

const checkoutSchema = z.object({
  customer_name: z.string().min(2).max(200),
  customer_email: z.string().email(),
  phone: z.string().max(20).optional(),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
    })
  ).min(1).max(20), // Max 20 items per order
  userId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { customer_name, customer_email, phone, items, userId } = parsed.data;

    // Use service role client for order creation (bypasses RLS)
    const supabase = await createServiceClient();

    // REMOVED: Client-sent prices are no longer accepted
    // Server fetches authoritative prices from database

    // Verify products exist and are published, and get current prices
    const productIds = items.map((item) => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, price, sale_price, published')
      .in('id', productIds);

    if (productsError || !products || products.length === 0) {
      return NextResponse.json(
        { error: 'Products not found' },
        { status: 404 }
      );
    }

    // Check all requested products are published
    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Some products are not available' },
        { status: 400 }
      );
    }

    const publishedProducts = products.filter((p) => p.published);
    if (publishedProducts.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Some products are not available' },
        { status: 400 }
      );
    }

    // Remove duplicates (client may have sent the same product twice)
    const uniqueProductIds = [...new Set(productIds)];
    const uniqueProducts = publishedProducts.filter(
      (p, index, self) => index === self.findIndex((s) => s.id === p.id)
    );

    // Calculate total SERVER-SIDE (never trust client amounts)
    const subtotal = uniqueProducts.reduce((sum, product) => {
      return sum + (product.sale_price || product.price);
    }, 0);

    const total = subtotal;

    // Validate total is positive
    if (total <= 0) {
      return NextResponse.json(
        { error: 'Invalid order total' },
        { status: 400 }
      );
    }

    // Generate unique reference
    const paystack_reference = generateOrderReference();

    // Create pending order (using service role, bypasses RLS)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId || null,
        customer_email,
        customer_name,
        phone: phone || null,
        subtotal,
        total,
        currency: 'NGN',
        status: 'pending',
        paystack_reference,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Create order items with server-calculated prices
    const orderItems = uniqueProducts.map((product) => ({
      order_id: order.id,
      product_id: product.id,
      title_snapshot: product.title,
      price_snapshot: product.sale_price || product.price,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // Initialize Paystack transaction
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const paystackResponse = await initializePaystackTransaction({
      email: customer_email,
      amount: nairaToKobo(total),
      reference: paystack_reference,
      callback_url: `${siteUrl}/checkout/success?ref=${paystack_reference}`,
      metadata: {
        order_id: order.id,
        customer_name,
        customer_email,
      },
    });

    if (!paystackResponse.status) {
      return NextResponse.json(
        { error: paystackResponse.message || 'Failed to initialize payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authorization_url: paystackResponse.data.authorization_url,
      reference: paystack_reference,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
