import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireSellerApi } from '@/lib/seller';
import { productInputSchema, productValidationMessage } from '@/lib/product-validation';
import { apiRateLimit } from '@/lib/api-rate-limit';

/**
 * GET  /api/seller/books — list the authenticated seller's OWN books.
 * POST /api/seller/books — create a new DRAFT book owned by the seller.
 *
 * Security invariants:
 * - seller identity is always derived from the authenticated session
 *   (requireSellerApi) — never from the request body.
 * - New books are created as workflow 'draft' with published=false; the
 *   seller can never set published/featured directly.
 * - Queries are scoped to seller_id = session user id.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSellerApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // optional filter

    const supabase = await createServiceClient();
    let query = supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('seller_id', auth.userId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      const allowed = ['draft', 'submitted', 'published', 'rejected', 'archived'];
      if (allowed.includes(status)) {
        query = query.eq('workflow_status', status);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('seller books list error:', { op: 'seller.listBooks', code: error.code });
      return NextResponse.json({ error: 'Failed to load books' }, { status: 500 });
    }

    return NextResponse.json({ books: data || [] });
  } catch (error) {
    console.error('seller books list error:', { op: 'seller.listBooks', error });
    return NextResponse.json({ error: 'Failed to load books' }, { status: 500 });
  }
}

/**
 * POST /api/seller/books — create a DRAFT book owned by the session seller.
 * The browser can never publish: published is forced false and workflow_status
 * is forced 'draft'. Admin approval controls publishing later.
 */
export async function POST(request: NextRequest) {
  try {
    const limited = apiRateLimit(request, { key: 'seller-create-book', limit: 20, windowMs: 60_000 });
    if (limited) return limited;

    const auth = await requireSellerApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const parsed = productInputSchema.safeParse(body);

    if (!parsed.success) {
      const { message } = productValidationMessage(parsed.error);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const input = parsed.data;
    const supabase = await createServiceClient();

    // Validate category reference up-front (avoids a generic FK 500).
    if (input.category_id) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('id', input.category_id)
        .maybeSingle();
      if (!cat) {
        return NextResponse.json({ error: 'The selected category is invalid' }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        title: input.title,
        slug: input.slug,
        author: input.author,
        short_description: input.short_description,
        description: input.description,
        price: input.price,
        sale_price: input.sale_price ?? null,
        age_min: input.age_min,
        age_max: input.age_max,
        reading_level: input.reading_level,
        page_count: input.page_count,
        reading_time: input.reading_time,
        category_id: input.category_id ?? null,
        // Seller books are NEVER auto-published and never self-featured.
        featured: false,
        published: false,
        workflow_status: 'draft',
        seller_id: auth.userId,
      })
      .select('id, title, slug, published, workflow_status')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A book with this slug already exists' },
          { status: 409 }
        );
      }
      if (error.code === '23514') {
        return NextResponse.json(
          { error: 'Product data violates a business rule (check price, sale price and age range)' },
          { status: 400 }
        );
      }
      console.error('seller create books error:', { op: 'seller.createBook', code: error.code });
      return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
    }

    return NextResponse.json({ success: true, book: data });
  } catch (error) {
    console.error('seller create book error:', { op: 'seller.createBook', error });
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}