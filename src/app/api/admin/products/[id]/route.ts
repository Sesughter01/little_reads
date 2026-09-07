import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth';
import { z } from 'zod';
import { productInputSchema, productValidationMessage } from '@/lib/product-validation';

const patchSchema = z.object({
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
});

const PRODUCT_PDF_REQUIRED_MESSAGE =
  'Upload the ebook PDF before publishing this book.';

/**
 * PUT /api/admin/products/[id] — update a product (server-validated).
 * Sale-price/age rules are enforced by the shared productInputSchema before
 * the database write, so constraint violations surface as HTTP 400 — never
 * as a generic 500.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await params;
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
        return NextResponse.json(
          { error: 'The selected category is invalid' },
          { status: 400 }
        );
      }
    }

    const { data: existing } = await supabase
      .from('products')
      .select('pdf_path')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Publishing requires an ebook PDF (prevents selling books that cannot
    // be delivered). Drafts are fine without one.
    if (input.published && !existing.pdf_path) {
      return NextResponse.json({ error: PRODUCT_PDF_REQUIRED_MESSAGE }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('products')
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      console.error('update product db error:', {
        op: 'admin.updateProduct',
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: data });
  } catch (error) {
    console.error('update product error:', { op: 'admin.updateProduct', error });
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/products/[id]
 * Server-guarded publish/unpublish and featured toggles.
 * Publishing still requires a PDF file on the product.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const patch = parsed.data;

    // Publishing (status → true) requires an ebook PDF.
    if (patch.published === true) {
      const { data: existing } = await supabase
        .from('products')
        .select('pdf_path')
        .eq('id', id)
        .maybeSingle();
      if (!existing) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      if (!existing.pdf_path) {
        return NextResponse.json({ error: PRODUCT_PDF_REQUIRED_MESSAGE }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('products')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, title, published, featured')
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/[id]
 *
 * Safe deletion: if the product has order history (order_items) or purchases,
 * it is ARCHIVED (published = false) instead of deleted so historical paid
 * orders keep working. Only products with no order/purchase references are
 * physically deleted.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await params;
    const supabase = await createServiceClient();

    // Check for historical references
    const [{ count: orderItemCount }, { count: purchaseCount }] = await Promise.all([
      supabase.from('order_items').select('id', { count: 'exact', head: true }).eq('product_id', id),
      supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('product_id', id),
    ]);

    if ((orderItemCount || 0) > 0 || (purchaseCount || 0) > 0) {
      // Archive instead of delete — preserves order history and downloads.
      const { error } = await supabase
        .from('products')
        .update({ published: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: 'Failed to archive product' }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        archived: true,
        message: 'This book has orders/purchases, so it was archived instead of deleted.',
      });
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({ success: true, archived: false });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
