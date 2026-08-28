import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify purchase
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', id)
      .single();

    if (!purchase) {
      return NextResponse.json({ error: 'You have not purchased this ebook' }, { status: 403 });
    }

    // Get product PDF path
    const { data: product } = await supabase
      .from('products')
      .select('pdf_path, title')
      .eq('id', id)
      .single();

    if (!product?.pdf_path) {
      return NextResponse.json({ error: 'Ebook file not found' }, { status: 404 });
    }

    // Create signed URL for download
    const { data: urlData, error: urlError } = await supabase.storage
      .from('ebook-files')
      .createSignedUrl(product.pdf_path, 300); // 5 minute expiry

    if (urlError || !urlData) {
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
    }

    // Redirect to the signed URL for download
    return NextResponse.redirect(urlData.signedUrl);
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
