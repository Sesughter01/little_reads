import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth';

/**
 * GET /api/admin/products/[id]/download
 *
 * Admin download of the ebook PDF attached to a product. Returns a short-lived
 * signed URL from the PRIVATE ebook-files bucket. Never exposes the service-role
 * key to the browser.
 *
 * Authorization:
 *   anonymous      → 401
 *   customer       → 403
 *   admin          → signed PDF URL (redirect)
 *   product has no PDF → 404
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const serviceClient = await createServiceClient();

    const { data: product, error: productError } = await serviceClient
      .from('products')
      .select('pdf_path')
      .eq('id', id)
      .maybeSingle();

    if (productError || !product || !product.pdf_path) {
      return NextResponse.json(
        { error: 'This product does not have an ebook PDF attached.' },
        { status: 404 }
      );
    }

    const { data: urlData, error: urlError } = await serviceClient.storage
      .from('ebook-files')
      .createSignedUrl(product.pdf_path, 300);

    if (urlError || !urlData) {
      console.error('Admin download signed URL error:', {
        op: 'admin.downloadProductPdf',
        productId: id.slice(0, 8),
        code: 'STORAGE_ERROR',
      });
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
    }

    return NextResponse.redirect(urlData.signedUrl);
  } catch (error) {
    console.error('Admin download error:', { op: 'admin.downloadProductPdf', error });
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
