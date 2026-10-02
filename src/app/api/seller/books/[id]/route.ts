import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireSellerApi } from '@/lib/seller';
import { productInputSchema, productValidationMessage } from '@/lib/product-validation';

/**
 * GET    /api/seller/books/[id] — fetch one of the seller's own books.
 * PUT    /api/seller/books/[id] — update the seller's own book.
 * DELETE /api/seller/books/[id] — delete the seller's own draft.
 *
 * Security invariants:
 * - A seller may ONLY access books where seller_id = session user id.
 * - A seller may NOT set published/featured (admin-only, enforced server-side
 *   AND by the DB trigger). workflow transitions happen via the submit route.
 * - Once a book is 'published'/'archived' the seller can no longer edit it.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSellerApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await params;

    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', id)
      .eq('seller_id', auth.userId)
      .maybeSingle();

    if (error) {
      console.error('seller book get error:', { op: 'seller.getBook', code: error.code });
      return NextResponse.json({ error: 'Failed to load book' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json({ book: data });
  } catch (error) {
    console.error('seller book get error:', { op: 'seller.getBook', error });
    return NextResponse.json({ error: 'Failed to load book' }, { status: 500 });
  }
}

/** Workflow states a seller may still edit. Published/archived are frozen. */
const EDITABLE_WORKFLOWS = new Set(['draft', 'submitted', 'rejected']);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSellerApi();
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

    const supabase = await createServiceClient();

    // Ownership + editability check in one authoritative read.
    const { data: existing, error: existingError } = await supabase
      .from('products')
      .select('id, seller_id, workflow_status, published')
      .eq('id', id)
      .eq('seller_id', auth.userId)
      .maybeSingle();

    if (existingError) {
      console.error('seller book update lookup error:', {
        op: 'seller.updateBook.lookup',
        code: existingError.code,
      });
      return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }
    if (!EDITABLE_WORKFLOWS.has(existing.workflow_status)) {
      return NextResponse.json(
        { error: 'This book is already published or archived and can no longer be edited.' },
        { status: 409 }
      );
    }

    const input = parsed.data;

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
        // published/featured are deliberately NEVER updated here.
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('seller_id', auth.userId)
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
      console.error('seller book update error:', { op: 'seller.updateBook', code: error.code });
      return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
    }

    return NextResponse.json({ success: true, book: data });
  } catch (error) {
    console.error('seller book update error:', { op: 'seller.updateBook', error });
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }
}

/**
 * DELETE /api/seller/books/[id] — only own DRAFT books can be deleted.
 * Submitted/published/rejected/archived books are immutable to the seller.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSellerApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await params;

    const supabase = await createServiceClient();
    const { data: existing, error: existingError } = await supabase
      .from('products')
      .select('id, seller_id, workflow_status')
      .eq('id', id)
      .eq('seller_id', auth.userId)
      .maybeSingle();

    if (existingError) {
      console.error('seller book delete lookup error:', {
        op: 'seller.deleteBook.lookup',
        code: existingError.code,
      });
      return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }
    if (existing.workflow_status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft books can be deleted by the seller.' },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('seller_id', auth.userId);

    if (error) {
      console.error('seller book delete error:', { op: 'seller.deleteBook', code: error.code });
      return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('seller book delete error:', { op: 'seller.deleteBook', error });
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
