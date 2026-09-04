import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth';

/**
 * GET /api/admin/search?q=<query>
 *
 * Admin-only search across products, orders, and customers — debounced client
 * use, min 2 chars, limited result counts. Never returns passwords/tokens/
 * raw auth data.
 */
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS_PER_GROUP = 10;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (q.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        { books: [], orders: [], customers: [], query: q },
        { status: 200 }
      );
    }

    const supabase = await createServiceClient();

    const searchPattern = `%${q}%`;

    // ── Products ──────────────────────────────────────────────────────────
    const { data: books, error: booksError } = await supabase
      .from('products')
      .select('id, title, author, slug, published')
      .or(`title.ilike.${searchPattern},author.ilike.${searchPattern},slug.ilike.${searchPattern}`)
      .limit(MAX_RESULTS_PER_GROUP);

    if (booksError) {
      console.error('Admin search books error:', { code: booksError.code });
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // ── Orders ────────────────────────────────────────────────────────────
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, customer_name, customer_email, paystack_reference, status, total')
      .or(`customer_name.ilike.${searchPattern},customer_email.ilike.${searchPattern},paystack_reference.ilike.${searchPattern}`)
      .limit(MAX_RESULTS_PER_GROUP);

    if (ordersError) {
      console.error('Admin search orders error:', { code: ordersError.code });
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // ── Customers ─────────────────────────────────────────────────────────
    const { data: customers, error: customersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      // Only show public name cols + email (already public in the current RLS policy)
      .or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern}`)
      .limit(MAX_RESULTS_PER_GROUP);

    if (customersError) {
      console.error('Admin search customers error:', { code: customersError.code });
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    const booksResult = (books || []).map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      slug: b.slug,
      published: b.published,
      href: `/admin/products/${b.id}/edit`,
      kind: 'book',
    }));

    const ordersResult = (orders || []).map((o) => ({
      id: o.id,
      customer_name: o.customer_name,
      customer_email: o.customer_email,
      paystack_reference: o.paystack_reference,
      status: o.status,
      total: o.total,
      href: `/admin/orders/${o.id}`,
      kind: 'order',
    }));

    const customersResult = (customers || []).map((c) => ({
      id: c.id,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      email: c.email || '',
      href: `/admin/customers/${c.id}`,
      kind: 'customer',
    }));

    return NextResponse.json({
      books: booksResult,
      orders: ordersResult,
      customers: customersResult,
      query: q,
    });
  } catch (error) {
    console.error('Admin search error:', { op: 'admin.search', error });
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
