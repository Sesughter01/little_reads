import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth';
import {
  PDF_BUCKET,
  PDF_MAGIC_PREFIX_LENGTH,
  PDF_MAX_BYTES,
  getPdfStoragePath,
  getStagedPdfPath,
  isValidStagedUploadId,
  readResponsePrefix,
} from '@/lib/pdf-upload';
import { validatePdfMagic } from '@/lib/upload-validation';

/**
 * POST /api/admin/products/[id]/pdf-finalize
 *
 * Finalize a direct browser → Supabase staged upload:
 *   1. requires authenticated admin
 *   2. verifies the product exists
 *   3. accepts ONLY an opaque server-issued upload id; the full staged path
 *      is re-derived server-side (productId + validated uploadId) — the
 *      client supplies NO path, bucket, or key
 *   4. reads object SIZE from storage metadata (list), never by downloading
 *   5. reads only the first 5 bytes via HTTP Range on a short-lived signed
 *      READ url (stream-capped fallback if Range is ignored)
 *   6. deletes INVALID staged objects and NEVER points products.pdf_path
 *      at them; the canonical PDF stays untouched on any failure
 *   7. on success, server-side COPIES staged → canonical, removes the
 *      staged object, and only then updates products.pdf_path
 *
 * Memory usage is effectively constant: at most a few bytes are ever read,
 * regardless of ebook size (up to 50 MB). The signed read url never leaves
 * the server.
 *
 * A book may remain a draft without a PDF; publishing still requires a
 * valid PDF (enforced by the product update APIs + client).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    const body = (await request.json().catch(() => null)) as {
      uploadId?: unknown;
    } | null;
    const uploadId = typeof body?.uploadId === 'string' ? body.uploadId : null;
    if (!isValidStagedUploadId(uploadId)) {
      return NextResponse.json(
        { error: 'Invalid upload reference. Please upload the PDF again.' },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();

    const { data: product, error: productError } = await serviceClient
      .from('products')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const stagedPath = getStagedPdfPath(id, uploadId as string);
    const canonicalPath = getPdfStoragePath(id);
    const stagedFileName = `${uploadId}.pdf`;
    const bucket = serviceClient.storage.from(PDF_BUCKET);

    // Size from metadata — no bytes downloaded.
    const { data: listed, error: listError } = await bucket.list(
      `staging/${id}`,
      { search: stagedFileName }
    );
    const entry = (listed || []).find((f) => f.name === stagedFileName);
    const storedSize =
      typeof entry?.metadata?.size === 'number' ? entry.metadata.size : NaN;

    if (listError || !entry || !Number.isFinite(storedSize)) {
      return NextResponse.json(
        { error: 'Upload not found. Please upload the PDF again.' },
        { status: 404 }
      );
    }

    if (!(storedSize > 0) || storedSize > PDF_MAX_BYTES) {
      await bucket.remove([stagedPath]);
      return NextResponse.json(
        { error: 'Invalid PDF. Max 50MB.' },
        { status: 400 }
      );
    }

    // First bytes only, via a short-lived signed READ url (server-side).
    const { data: signed, error: signError } = await bucket.createSignedUrl(
      stagedPath,
      60
    );
    if (signError || !signed?.signedUrl) {
      console.error('PDF finalize sign failed:', {
        op: 'admin.pdfFinalize.sign',
        message: signError?.message,
      });
      return NextResponse.json(
        { error: 'Failed to finalize upload. Please try again.' },
        { status: 500 }
      );
    }

    let prefix: ArrayBuffer | null = null;
    try {
      const ranged = await fetch(signed.signedUrl, {
        headers: { Range: `bytes=0-${PDF_MAGIC_PREFIX_LENGTH - 1}` },
      });
      if (ranged.status !== 206 && ranged.status !== 200) {
        return NextResponse.json(
          { error: 'Failed to finalize upload. Please try again.' },
          { status: 500 }
        );
      }
      // 206 → exactly the prefix; 200 (Range ignored) → stream-capped read of
      // the first bytes only, then cancel the reader. The full body is
      // never buffered regardless of ebook size.
      prefix = await readResponsePrefix(ranged, PDF_MAGIC_PREFIX_LENGTH);
    } catch {
      return NextResponse.json(
        { error: 'Failed to finalize upload. Please try again.' },
        { status: 500 }
      );
    }

    if (!prefix || prefix.byteLength < PDF_MAGIC_PREFIX_LENGTH || !validatePdfMagic(prefix)) {
      // Invalid content: delete the STAGED object only. The canonical PDF
      // (if any) is untouched and products.pdf_path is unchanged.
      await bucket.remove([stagedPath]);
      return NextResponse.json(
        { error: 'File content is not a valid PDF.' },
        { status: 400 }
      );
    }

    // Promote server-side: copy staged → canonical. The canonical object is
    // only overwritten here, after validation succeeded.
    const { error: copyError } = await bucket.copy(stagedPath, canonicalPath);
    if (copyError) {
      console.error('PDF promote failed:', {
        op: 'admin.pdfFinalize.copy',
        message: copyError.message,
      });
      return NextResponse.json(
        { error: 'Failed to finalize upload. Please try again.' },
        { status: 500 }
      );
    }

    const { error: updateError } = await serviceClient
      .from('products')
      .update({ pdf_path: canonicalPath, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      console.error('PDF finalize DB update failed:', {
        op: 'admin.pdfFinalize.dbUpdate',
        code: updateError.code,
      });
      // The promoted file is valid and in place; do NOT delete it — retrying
      // finalize (re-upload) stays safe and the error tells the admin to retry.
      return NextResponse.json(
        { error: 'Upload validated but product update failed. Please try again.' },
        { status: 500 }
      );
    }

    // Best-effort staged cleanup AFTER the DB points at the canonical file.
    const { error: cleanupError } = await bucket.remove([stagedPath]);
    if (cleanupError) {
      console.error('Staged PDF cleanup failed:', {
        op: 'admin.pdfFinalize.cleanup',
        message: cleanupError.message,
      });
    }

    return NextResponse.json({ success: true, pdf_path: canonicalPath });
  } catch (error) {
    console.error('PDF finalize error:', { op: 'admin.pdfFinalize', error });
    return NextResponse.json(
      { error: 'Failed to finalize upload. Please try again.' },
      { status: 500 }
    );
  }
}
