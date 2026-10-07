import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth';
import {
  detectImageMimeFromBytes,
  sanitizeSvg,
} from '@/lib/upload-validation';

const COVER_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const COVER_MAX_BYTES = 10 * 1024 * 1024;
// PDFs are NOT accepted here. Ebook PDFs must use the direct-upload flow
// (POST .../pdf-upload-url → browser-direct staged upload → POST
// .../pdf-finalize), because proxying multi-MB PDFs through this route hits
// hosting request limits (413) before any app validation runs.

/**
 * POST /api/admin/products/[id]/assets
 *
 * Upload (or replace) a book cover in the public `ebook-covers` bucket.
 * PDF uploads via this route are GONE (410) — use the direct-upload flow.
 *
 * Storage paths are scoped to the real product id:
 *   ebook-covers/{productId}.{ext}
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

    // Legacy proxied PDF uploads are disabled: PDFs must travel browser →
    // Supabase directly via the staged authorize/finalize flow, never through
    // a Next.js request body. Rejected here — before any byte is read,
    // uploaded, or written to the database. (formData parsing above is
    // unavoidable to learn `type`, but no file bytes are consumed past it.)
    if (type === 'pdf') {
      return NextResponse.json(
        { error: 'Direct PDF upload is required. Use the PDF upload authorization flow.' },
        { status: 410 }
      );
    }

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!COVER_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PNG, JPEG, WebP, SVG' },
        { status: 400 }
      );
    }
    if (file.size > COVER_MAX_BYTES) {
      return NextResponse.json({ error: 'File too large. Max 10MB' }, { status: 400 });
    }
    const ext =
      file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1];

    // Content validation: the declared Content-Type is client-controlled.
    // Verify magic bytes match the claim, and neutralize scripts inside SVG
    // (SVG is served from the public covers bucket — stored XSS otherwise).
    const buffer = await file.arrayBuffer();
    const declared = file.type;
    if (declared === 'image/svg+xml') {
      const svgOk = sanitizeSvg(buffer);
      if (!svgOk.ok) {
        return NextResponse.json(
          { error: 'This SVG contains script content and was rejected. Export a static SVG or use PNG/JPEG/WebP.' },
          { status: 400 }
        );
      }
    } else if (detectImageMimeFromBytes(buffer) !== declared) {
      return NextResponse.json(
        { error: 'File content does not match its type. Upload a real image.' },
        { status: 400 }
      );
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

    const bucket = 'ebook-covers';
    // Path is derived server-side from the real product id — never from the
    // client-supplied filename, which prevents arbitrary storage paths.
    const filePath = `${id}.${ext}`;

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
    const { data: urlData } = serviceClient.storage
      .from(bucket)
      .getPublicUrl(filePath);
    updateData.cover_url = urlData.publicUrl;

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

    // Cover replacement with a different extension orphans the old object
    // (`{id}.png` vs `{id}.webp`), because upsert only writes the new key.
    // Remove the superseded object ONLY after the new upload + DB update
    // succeeded, so the only valid cover is never deleted first.
    const previousFile = product.cover_url?.split('/').pop()?.split('?')[0];
    if (previousFile && previousFile !== filePath) {
      const { error: cleanupError } = await serviceClient.storage
        .from(bucket)
        .remove([previousFile]);
      if (cleanupError) {
        console.error('Stale cover cleanup failed:', {
          op: 'admin.uploadAsset.coverCleanup',
          message: cleanupError.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      type,
      path: filePath,
      cover_url: updateData.cover_url,
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
