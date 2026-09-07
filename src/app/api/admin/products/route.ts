import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth';
import { productInputSchema, productValidationMessage } from '@/lib/product-validation';

/**
 * POST /api/admin/products — create a product (server-validated, admin-only).
 *
 * Error contract:
 *   400 invalid payload / invalid sale price / invalid age range / bad category
 *   401 unauthenticated
 *   403 authenticated non-admin
 *   409 duplicate slug
 *   500 unexpected database/server failure
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
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

    // A book cannot be published at creation: it has no PDF yet (assets are
    // uploaded after the product row exists). Publishing happens on the edit
    // screen once the ebook PDF is in place.
    if (input.published) {
      return NextResponse.json(
        { error: 'Create the book as a draft first, upload the ebook PDF, then publish it.' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Validate category reference up-front (avoids a generic FK 500).
    if (input.category_id) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('id', input.category_id)
        .maybeSingle();
      if (!cat) {
        return NextResponse.json(
          { error: 'The selected category is invalid' },
          { status: 400 }
        );
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
        featured: input.featured,
        published: input.published,
      })
      .select('id, title, slug, published')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A book with this slug already exists' },
          { status: 409 }
        );
      }
      if (error.code === '23514') {
        // Database CHECK violation — should be prevented by validation above.
        return NextResponse.json(
          { error: 'Product data violates a business rule (check price, sale price and age range)' },
          { status: 400 }
        );
      }
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'The selected category is invalid' },
          { status: 400 }
        );
      }
      console.error('create product db error:', {
        op: 'admin.createProduct',
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    // Return the new product id so the caller can continue to Step 2
    // (cover/PDF upload) against the real product id.
    return NextResponse.json({ success: true, product: data });
  } catch (error) {
    console.error('create product error:', { op: 'admin.createProduct', error });
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
