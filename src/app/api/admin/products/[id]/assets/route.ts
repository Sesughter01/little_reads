import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    await requireAdmin();

    const { id } = await params;
    const formData = await request.formData();
    const type = formData.get('type') as 'cover' | 'pdf';
    const file = formData.get('file') as File | null;

    if (!type || !['cover', 'pdf'].includes(type)) {
      return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 });
    }

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (type === 'cover') {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Allowed: PNG, JPEG, WebP, SVG' },
          { status: 400 }
        );
      }
      // 10MB limit for covers
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large. Max 10MB' }, { status: 400 });
      }
    } else {
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: 'Invalid file type. Only PDF allowed' },
          { status: 400 }
        );
      }
      // 50MB limit for PDFs
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large. Max 50MB' }, { status: 400 });
      }
    }

    const supabase = await createClient();

    // Get current product to find existing asset path
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('cover_url, pdf_path, slug')
      .eq('id', id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Use service client for storage operations
    const serviceClient = await createServiceClient();
    const bucket = type === 'cover' ? 'ebook-covers' : 'ebook-files';
    const ext = file.name.split('.').pop() || (type === 'cover' ? 'png' : 'pdf');
    const filePath = `${product.slug}.${ext}`;

    // Upload file
    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await serviceClient.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Get public URL for covers or update pdf_path
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (type === 'cover') {
      const { data: urlData } = serviceClient.storage
        .from(bucket)
        .getPublicUrl(filePath);
      updateData.cover_url = urlData.publicUrl;
    } else {
      updateData.pdf_path = filePath;
    }

    // Update product record
    const { error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      type,
      path: filePath,
      ...(type === 'cover' ? { cover_url: updateData.cover_url } : { pdf_path: filePath }),
    });
  } catch (error) {
    console.error('Asset upload error:', error);
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'cover' | 'pdf';

    if (!type || !['cover', 'pdf'].includes(type)) {
      return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 });
    }

    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const { data: product } = await supabase
      .from('products')
      .select('cover_url, pdf_path')
      .eq('id', id)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const bucket = type === 'cover' ? 'ebook-covers' : 'ebook-files';
    const filePath = type === 'cover'
      ? product.cover_url?.split('/').pop()
      : product.pdf_path;

    if (filePath) {
      await serviceClient.storage.from(bucket).remove([filePath]);
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (type === 'cover') {
      updateData.cover_url = null;
    } else {
      updateData.pdf_path = null;
    }

    await supabase.from('products').update(updateData).eq('id', id);

    return NextResponse.json({ success: true, type });
  } catch (error) {
    console.error('Asset delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
