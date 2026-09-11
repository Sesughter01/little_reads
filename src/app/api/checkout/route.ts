import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  initializePaystackTransaction,
  generateOrderReference,
  nairaToKobo,
  isPaystackConfigured,
} from '@/lib/paystack';
import { buildCheckoutCallbackUrl } from '@/lib/checkout-callback';
import {
  checkRateLimit,
  tooManyRequestsResponse,
} from '@/lib/api-rate-limit';
import { z } from 'zod';

/**
 * Checkout request. NOTE: there is deliberately NO userId field — order
 * ownership is always derived from the authenticated Supabase session on the
 * server. A browser-supplied userId would let user A create purchases under
 * user B's UUID.
 */
const checkoutSchema = z.object({
  customer_name: z.string().min(2).max(200),
  /**
   * OPTIONAL contact email for order receipts/correspondence. When omitted it
   * defaults to the signed-in account email. It is deliberately NOT used for
   * Paystack initialization (the verified account email always receives the
   * payment receipt) and never influences order ownership, which is derived
   * from the authenticated session server-side.
   */
  customer_email: z.string().email().max(254).optional(),
  phone: z.string().max(20).optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
      })
    )
    .min(1)
    .max(20), // Max 20 items per order
}).refine(
  // Duplicate product ids are deduped server-side, but rejecting them here
  // gives a clear 400 instead of silently charging for a shorter cart.
  (data) => {
    const ids = data.items.map((item) => item.product_id);
    return new Set(ids).size === ids.length;
  },
  { message: 'Duplicate items in cart', path: ['items'] }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // ── Authenticate the user with the request-scoped session ──────────
    // Middleware protects the /checkout pages, but this API route must also
    // defend itself: an anonymous caller gets 401, never an order.
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Sign in to continue checkout.' },
        { status: 401 }
      );
    }

    // Throttle checkout attempts per account: creates Paystack transactions
    // and pending orders, both of which are costly to spam.
    const limit = checkRateLimit(`checkout:${authUser.id}`, 10, 10 * 60_000);
    if (!limit.allowed) {
      return tooManyRequestsResponse(limit);
    }

    const { customer_name, customer_email, phone, items } = parsed.data;

    // The order's owning user id is the authenticated user — never the client.
    const userId = authUser.id;
    const accountEmail = (authUser.email || '').trim().toLowerCase();

    // Ownership-preserving contact email: the client MAY supply an alternative
    // contact address for order correspondence, but ownership is and remains
    // the authenticated session user. When no contact email is supplied the
    // account email is used, exactly as before.
    const contactEmail = customer_email
      ? customer_email.trim().toLowerCase()
      : accountEmail;

    if (!accountEmail || !contactEmail) {
      return NextResponse.json(
        { error: 'A valid email address is required to check out.' },
        { status: 400 }
      );
    }

    // Controlled failure when Paystack is not configured — never call Paystack
    // with a placeholder key and then show "Invalid key" to the customer.
    if (!isPaystackConfigured()) {
      return NextResponse.json(
        { error: 'Payment service is not configured correctly.' },
        { status: 503 }
      );
    }

    // Use service role client for order creation (bypasses RLS)
    const serviceClient = await createServiceClient();

    // Server fetches authoritative prices from the database.
    const productIds = items.map((item) => item.product_id);
    const { data: products, error: productsError } = await serviceClient
      .from('products')
      .select('id, title, price, sale_price, published')
      .in('id', productIds);

    if (productsError || !products || products.length === 0) {
      return NextResponse.json({ error: 'Products not found' }, { status: 404 });
    }

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
    const uniqueProducts = publishedProducts.filter(
      (p, index, self) => index === self.findIndex((s) => s.id === p.id)
    );

    // Calculate total SERVER-SIDE (never trust client amounts).
    const subtotal = uniqueProducts.reduce((sum, product) => {
      return sum + (product.sale_price && product.sale_price > 0 ? product.sale_price : product.price);
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

    // Create pending order owned by the AUTHENTICATED user.
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .insert({
        user_id: userId,
        customer_email: contactEmail,
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
      console.error('Checkout: order insert error', {
        op: 'checkout.createOrder',
        code: orderError.code,
      });
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Create order items with server-calculated prices
    const orderItems = uniqueProducts.map((product) => ({
      order_id: order.id,
      product_id: product.id,
      title_snapshot: product.title,
      price_snapshot:
        product.sale_price && product.sale_price > 0 ? product.sale_price : product.price,
    }));

    const { error: itemsError } = await serviceClient.from('order_items').insert(orderItems);

    if (itemsError) {
      console.error('Checkout: order items insert error', {
        op: 'checkout.createOrderItems',
        code: itemsError.code,
      });
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // Initialize Paystack transaction. Routing follows the configured key
    // mode: LIVE keys (production) always return to the canonical Little Reads
    // domain; TEST keys return to the origin serving this request (a Vercel
    // Preview alias in preview, the loopback host in local development).
    const callback_url = buildCheckoutCallbackUrl(request.headers, paystack_reference);

    const paystackResponse = await initializePaystackTransaction({
      email: accountEmail,
      amount: nairaToKobo(total),
      reference: paystack_reference,
      callback_url,
      metadata: {
        order_id: order.id,
        customer_name,
        customer_email: accountEmail,
        user_id: userId,
      },
      // contact_email is recorded for support/receipt correspondence only.
      // Keep it out of payment metadata: Paystack receipt always goes to the
      // verified account email above.
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
    console.error('Checkout error:', { op: 'checkout', error });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
