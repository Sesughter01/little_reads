import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth';

const COVER_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const COVER_MAX_BYTES = 10 * 1024 * 1024;
const PDF_MAX_BYTES = 50 * 1024 * 1024;

/**
 * POST /api/admin/products/[id]/assets
 *
 * Upload (or replace) a book cover in the public `ebook-covers` bucket or the
 * ebook PDF in the PRIVATE `ebook-files` bucket.
 *
 * Storage paths are scoped to the real product id:
 *   ebook-covers/{productId}.{ext}
 *   ebook-files/{productId}.pdf
 *
 * Upload-then-update ordering: the new file is uploaded first and only after
 * that succeeds is the products row updated, so we never leave a database
 * reference pointing at a missing object.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // API-safe admin guard: 401 unauthenticated / 403 non-admin — never a
    // page redirect (which would otherwise surface as a NEXT_REDIRECT 500).
    const auth = await requireAdminApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

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

    let ext: string;
    if (type === 'cover') {
      if (!COVER_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Allowed: PNG, JPEG, WebP, SVG' },
          { status: 400 }
        );
      }
      if (file.size > COVER_MAX_BYTES) {
        return NextResponse.json({ error: 'File too large. Max 10MB' }, { status: 400 });
      }
      ext = file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1];
    } else {
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: 'Invalid file type. Only PDF allowed' },
          { status: 400 }
        );
      }
      if (file.size > PDF_MAX_BYTES) {
        return NextResponse.json({ error: 'File too large. Max 50MB' }, { status: 400 });
      }
      ext = 'pdf';
    }

    const serviceClient = await createServiceClient();

    // Product must exist before any file is written (no orphan uploads).
    const { data: product, error: productError } = await serviceClient
      .from('products')
      .select('cover_url, pdf_path')
      .eq('id', id)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const bucket = type === 'cover' ? 'ebook-covers' : 'ebook-files';
    // Path is derived server-side from the real product id — never from the
    // client-supplied filename, which prevents arbitrary storage paths.
    const filePath = type === 'cover' ? `${id}.${ext}` : `${id}.pdf`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await serviceClient.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Asset upload failed:', {
        op: 'admin.uploadAsset',
        bucket,
        message: uploadError.message,
      });
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Update the product reference only after the upload succeeded.
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (type === 'cover') {
      const { data: urlData } = serviceClient.storage
        .from(bucket)
        .getPublicUrl(filePath);
      updateData.cover_url = urlData.publicUrl;
    } else {
      updateData.pdf_path = filePath;
    }

    const { error: updateError } = await serviceClient
      .from('products')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Asset DB update failed:', {
        op: 'admin.uploadAsset.dbUpdate',
        code: updateError.code,
        message: updateError.message,
      });
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      type,
      path: filePath,
      ...(type === 'cover' ? { cover_url: updateData.cover_url } : { pdf_path: filePath }),
    });
  } catch (error) {
    console.error('Asset upload error:', { op: 'admin.uploadAsset', error });
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/[id]/assets?type=cover|pdf
 * Removes the stored file and nulls the product reference.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'cover' | 'pdf';

    if (!type || !['cover', 'pdf'].includes(type)) {
      return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 });
    }

    const serviceClient = await createServiceClient();

    const { data: product } = await serviceClient
      .from('products')
      .select('cover_url, pdf_path')
      .eq('id', id)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const bucket = type === 'cover' ? 'ebook-covers' : 'ebook-files';
    // Reconstruct the server-side path from the product id (single source of
    // truth), never from a client-supplied path.
    const filePath =
      type === 'cover'
        ? (product.cover_url?.split('/').pop()?.split('?')[0] ?? null)
        : product.pdf_path;

    if (filePath && filePath !== '') {
      await serviceClient.storage.from(bucket).remove([filePath]);
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (type === 'cover') {
      updateData.cover_url = null;
    } else {
      updateData.pdf_path = null;
    }

    await serviceClient.from('products').update(updateData).eq('id', id);

    return NextResponse.json({ success: true, type });
  } catch (error) {
    console.error('Asset delete error:', { op: 'admin.deleteAsset', error });
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
