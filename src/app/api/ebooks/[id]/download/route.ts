import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * Ebook download route.
 *
 * Architecture:
 *   1. Cookie-based client (createClient) — authenticates the current
      user and verifies the purchase belongs to them.
 *   2. Service-role client (createServiceClient) — only used AFTER
      purchase verification to create a short-lived signed URL from
      the ebook-files storage bucket.
 *
 * The service-role key is never exposed to client-side code.
 * The service-role client is never used to determine who the
 * current user is.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ── Step 1: Authenticate with cookie-based client ──────────
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // ── Step 2: Verify purchase belongs to this user ───────────
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', id)
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'You have not purchased this ebook' },
        { status: 403 },
      );
    }

    // ── Step 3: Fetch product pdf_path with cookie client ──────
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('pdf_path')
      .eq('id', id)
      .single();

    if (productError || !product?.pdf_path) {
      return NextResponse.json(
        { error: 'Ebook file not found' },
        { status: 404 },
      );
    }

    // ── Step 4: Create signed URL with service-role client ──────
    const serviceSupabase = await createServiceClient();

    const { data: urlData, error: urlError } = await serviceSupabase.storage
      .from('ebook-files')
      .createSignedUrl(product.pdf_path, 300);

    if (urlError || !urlData) {
      return NextResponse.json(
        { error: 'Failed to generate download link' },
        { status: 500 },
      );
    }

    // Redirect to the signed URL for download
    return NextResponse.redirect(urlData.signedUrl);
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 },
    );
  }
}
