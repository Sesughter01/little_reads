import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';
import { productInputSchema } from '../route';

const patchSchema = z.object({
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
});

/**
 * PUT /api/admin/products/[id] — update a product (server-validated).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = productInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid product data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    if (input.age_max < input.age_min) {
      return NextResponse.json(
        { error: 'Maximum age must be greater than or equal to minimum age' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();
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
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      console.error('Error updating product:', error);
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: data });
  } catch (error) {
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/products/[id]
 * Server-guarded publish/unpublish and featured toggles.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from('products')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, title, published, featured')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: data });
  } catch (error) {
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
    await requireAdmin();
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
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}