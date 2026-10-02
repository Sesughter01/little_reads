import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireSellerApi } from '@/lib/seller';

/**
 * POST /api/seller/books/[id]/submit — submit a draft book for admin review.
 *
 * Legal transitions:
 *   draft → submitted     (new submission)
 *   rejected → submitted  (revised application)
 *
 * The seller can NEVER set 'published'/'archived' — that is admin-only and
 * additionally enforced by the trg_seller_product_workflow DB trigger.
 */
export async function POST(
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
    const { data: existing, error: lookupError } = await supabase
      .from('products')
      .select('id, seller_id, workflow_status, published, price')
      .eq('id', id)
      .eq('seller_id', auth.userId)
      .maybeSingle();

    if (lookupError) {
      console.error('seller submit lookup error:', {
        op: 'seller.submitBook.lookup',
        code: lookupError.code,
      });
      return NextResponse.json({ error: 'Failed to submit book' }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (existing.workflow_status !== 'draft' && existing.workflow_status !== 'rejected') {
      return NextResponse.json(
        { error: 'This book is already under review, published, or archived.' },
        { status: 409 }
      );
    }

    if (!existing.price || existing.price <= 0) {
      return NextResponse.json(
        { error: 'Set a price greater than 0 before submitting for review.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('products')
      .update({
        workflow_status: 'submitted',
        published: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('seller_id', auth.userId)
      .select('id, title, slug, published, workflow_status')
      .single();

    if (error) {
      console.error('seller submit error:', { op: 'seller.submitBook', code: error.code });
      return NextResponse.json({ error: 'Failed to submit book' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      book: data,
      message: 'Your book has been submitted for review.',
    });
  } catch (error) {
    console.error('seller submit error:', { op: 'seller.submitBook', error });
    return NextResponse.json({ error: 'Failed to submit book' }, { status: 500 });
  }
}