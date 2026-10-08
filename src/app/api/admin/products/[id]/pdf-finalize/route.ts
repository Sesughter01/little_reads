import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth';
import {
  PDF_BUCKET,
  PDF_MAGIC_PREFIX_LENGTH,
  PDF_MAX_BYTES,
  getStagedPdfPath,
  isManagedPdfPath,
  isValidStagedUploadId,
  readResponsePrefix,
} from '@/lib/pdf-upload';
import { validatePdfMagic } from '@/lib/upload-validation';

/**
 * POST /api/admin/products/[id]/pdf-finalize
 *
 * Finalize a direct browser → Supabase staged upload WITHOUT moving bytes:
 * the database pointer is the atomic replacement mechanism.
 *   1. requires authenticated admin
 *   2. verifies the product exists (and remembers the current pdf_path)
 *   3. accepts ONLY an opaque server-issued upload id; the full staged path
 *      is re-derived server-side (productId + validated uploadId) — the
 *      client supplies NO path, bucket, or key
 *   4. reads object SIZE from storage metadata (list), never by downloading
 *   5. reads only the first 5 bytes via HTTP Range on a short-lived signed
 *      READ url (stream-capped fallback if Range is ignored)
 *   6. deletes INVALID staged objects and NEVER points products.pdf_path
 *      at them; the previous PDF stays untouched on any failure
 *   7. on success, points products.pdf_path DIRECTLY at the validated unique
 *      staged object — the pointer swap replaces any byte transfer, so even
 *      50 MB files finalize instantly
 *   8. ONLY after the DB update succeeds, best-effort deletes the previous
 *      object when it is a recognized LittleReads path of this product;
 *      cleanup failure never fails the upload
 *
 * Memory and transfer are effectively constant: at most a few bytes are ever
 * read, regardless of ebook size (up to 50 MB). The signed read url never
 * leaves the server.
 *
 * A book may remain a draft without a PDF; publishing still requires a
 * valid PDF (enforced by the product update APIs + client).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Elapsed-time diagnostics (durations only — never tokens, urls, cookies).
  const startedAt = Date.now();
  const mark = (stage: string) => {
    console.log('PDF finalize timing:', {
      op: 'admin.pdfFinalize.timing',
      stage,
      ms: Date.now() - startedAt,
    });
  };

  try {
    const auth = await requireAdminApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    mark('auth');

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
      .select('id, pdf_path')
      .eq('id', id)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    mark('product-check');

    const stagedPath = getStagedPdfPath(id, uploadId as string);
    const previousPath =
      typeof product.pdf_path === 'string' ? product.pdf_path : null;
    const bucket = serviceClient.storage.from(PDF_BUCKET);

    // Size from metadata — no bytes downloaded.
    const { data: listed, error: listError } = await bucket.list(
      `staging/${id}`,
      { search: `${uploadId}.pdf` }
    );
    const entry = (listed || []).find((f) => f.name === `${uploadId}.pdf`);
    const storedSize =
      typeof entry?.metadata?.size === 'number' ? entry.metadata.size : NaN;

    if (listError || !entry || !Number.isFinite(storedSize)) {
      return NextResponse.json(
        { error: 'Upload not found. Please upload the PDF again.' },
        { status: 404 }
      );
    }
    mark('metadata');

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
    mark('signed-read-url');

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
    mark('magic-prefix-fetch');

    if (!prefix || prefix.byteLength < PDF_MAGIC_PREFIX_LENGTH || !validatePdfMagic(prefix)) {
      // Invalid content: delete the STAGED object only. The previous PDF
      // (if any) is untouched and products.pdf_path is unchanged.
      await bucket.remove([stagedPath]);
      return NextResponse.json(
        { error: 'File content is not a valid PDF.' },
        { status: 400 }
      );
    }

    // Pointer swap: the DB now references the validated unique object.
    // No copy, no move, no byte transfer — instant even for 50 MB files.
    // On DB failure the old pdf_path stays active, the old object is
    // untouched, and the staged candidate remains for a safe retry.
    const { error: updateError } = await serviceClient
      .from('products')
      .update({ pdf_path: stagedPath, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      console.error('PDF finalize DB update failed:', {
        op: 'admin.pdfFinalize.dbUpdate',
        code: updateError.code,
      });
      return NextResponse.json(
        { error: 'Upload validated but product update failed. Please try again.' },
        { status: 500 }
      );
    }
    mark('database-update');

    // Best-effort cleanup of the superseded object AFTER the DB points at
    // the new file — and ONLY when it is a recognized LittleReads path of
    // this product. Cleanup failure never fails the upload.
    if (previousPath && previousPath !== stagedPath && isManagedPdfPath(id, previousPath)) {
      const { error: cleanupError } = await bucket.remove([previousPath]);
      if (cleanupError) {
        console.error('Previous PDF cleanup failed:', {
          op: 'admin.pdfFinalize.cleanup',
          message: cleanupError.message,
        });
      }
    }
    mark('old-object-cleanup');

    return NextResponse.json({ success: true, pdf_path: stagedPath });
  } catch (error) {
    console.error('PDF finalize error:', { op: 'admin.pdfFinalize', error });
    return NextResponse.json(
      { error: 'Failed to finalize upload. Please try again.' },
      { status: 500 }
    );
  }
}
