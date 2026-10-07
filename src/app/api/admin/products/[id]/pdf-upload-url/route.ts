import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth';
import {
  PDF_BUCKET,
  PDF_MAX_BYTES,
  getStagedPdfPath,
  isValidPdfSize,
} from '@/lib/pdf-upload';

/**
 * POST /api/admin/products/[id]/pdf-upload-url
 *
 * Authorize a direct browser → Supabase Storage upload for the product PDF.
 * The file itself NEVER passes through the Next.js request body, so hosting
 * request limits (413) cannot reject large PDFs before validation.
 *
 * STAGED model: the token is scoped to a server-generated staged object
 * (`staging/{productId}/{uploadId}.pdf`), never to the canonical
 * `{productId}.pdf`. The live PDF stays untouched until finalize validates
 * the staged file and promotes it. A failed upload can therefore never
 * destroy the existing valid PDF.
 *
 * Request JSON: { sizeBytes: number, contentType?: string }
 *
 * - requires authenticated admin (401/403, never redirect)
 * - verifies the product exists (404)
 * - validates declared size (1 byte .. 50 MB) — actual bytes re-validated
 *   at finalize from storage metadata, so a lying client gains nothing
 * - derives the staged path server-side (product id + fresh upload id);
 *   never accepts a client-supplied storage path, bucket, or key
 * - returns a short-lived signed upload token (scoped to that staged object
 *   only); the service-role key never leaves the server
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
      sizeBytes?: unknown;
      contentType?: unknown;
    } | null;

    const sizeBytes = typeof body?.sizeBytes === 'number' ? body.sizeBytes : NaN;
    if (!isValidPdfSize(sizeBytes)) {
      return NextResponse.json(
        { error: `Invalid PDF size. Max ${PDF_MAX_BYTES / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    if (
      body?.contentType !== undefined &&
      body.contentType !== 'application/pdf'
    ) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF allowed' },
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

    // High-entropy staged upload id; the finalize endpoint accepts only this
    // strict shape and re-derives the full path itself.
    const uploadId = randomUUID().replace(/-/g, '');
    const stagedPath = getStagedPdfPath(id, uploadId);

    // No upsert: each upload id is unique, so a token can never overwrite an
    // existing object (canonical or another staged upload).
    const { data, error: signError } = await serviceClient.storage
      .from(PDF_BUCKET)
      .createSignedUploadUrl(stagedPath);

    if (signError || !data) {
      console.error('PDF upload URL failed:', {
        op: 'admin.pdfUploadUrl',
        message: signError?.message,
      });
      return NextResponse.json(
        { error: 'Could not authorize upload. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bucket: PDF_BUCKET,
      path: stagedPath,
      uploadId,
      token: data.token,
    });
  } catch (error) {
    console.error('PDF upload URL error:', { op: 'admin.pdfUploadUrl', error });
    return NextResponse.json(
      { error: 'Could not authorize upload. Please try again.' },
      { status: 500 }
    );
  }
}
