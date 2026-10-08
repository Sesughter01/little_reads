/**
 * PDF direct-upload shared constants and pure helpers.
 *
 * Large PDFs never travel through a Next.js request body. The flow is:
 *   authorize (server derives a staged path) → browser uploads direct to
 *   Supabase Storage → finalize (server validates staged object by metadata
 *   + first bytes, then promotes to the canonical path).
 *
 * The canonical path is ALWAYS derived server-side from the product id:
 *   ebook-files/{productId}.pdf
 * Replacements are staged under a server-generated upload id and the
 * canonical object is only overwritten AFTER the staged file validates,
 * so a failed upload can never destroy the live PDF. The client never
 * supplies a storage path, bucket, or key.
 */

export const PDF_BUCKET = 'ebook-files';
export const PDF_MAX_BYTES = 50 * 1024 * 1024;
export const PDF_MIME_TYPE = 'application/pdf';

/** Number of leading bytes needed to verify the PDF header ("%PDF-"). */
export const PDF_MAGIC_PREFIX_LENGTH = 5;

/** Product-scoped staging prefix for unvalidated uploads. */
export const PDF_STAGING_PREFIX = 'staging';

/** Server-generated staged upload ids: 32 lowercase hex chars. */
const STAGED_UPLOAD_ID_PATTERN = /^[a-f0-9]{32}$/;

/** Server-derived canonical storage path for a product's ebook PDF. */
export function getPdfStoragePath(productId: string): string {
  return `${productId}.pdf`;
}

/** Server-derived staged path for one upload attempt (never client input). */
export function getStagedPdfPath(productId: string, uploadId: string): string {
  return `${PDF_STAGING_PREFIX}/${productId}/${uploadId}.pdf`;
}

/** Strict allowlist for upload ids travelling browser → finalize. */
export function isValidStagedUploadId(uploadId: string | null | undefined): boolean {
  return typeof uploadId === 'string' && STAGED_UPLOAD_ID_PATTERN.test(uploadId);
}

/**
 * True only for LittleReads-managed PDF objects of THIS product that are
 * safe to delete after a successful pointer swap:
 *   - the legacy canonical `{productId}.pdf` (exact match for this product;
 *     pre-pointer-swap books still reference this layout, which is never
 *     created for new uploads and never migrated), or
 *   - a staged `staging/{productId}/{32hex}.pdf` of this product.
 *
 * Anything else (seed paths, foreign keys, other products' objects) returns
 * false and must NEVER be auto-deleted.
 */
export function isManagedPdfPath(productId: string, pdfPath: string | null | undefined): boolean {
  if (typeof pdfPath !== 'string' || pdfPath.length === 0) return false;
  if (pdfPath === getPdfStoragePath(productId)) return true;
  const stagedPrefix = `${PDF_STAGING_PREFIX}/${productId}/`;
  if (!pdfPath.startsWith(stagedPrefix)) return false;
  const rest = pdfPath.slice(stagedPrefix.length);
  return rest.length === 36 && rest.endsWith('.pdf') && STAGED_UPLOAD_ID_PATTERN.test(rest.slice(0, 32));
}

/** Client/authorization-side size gate: 1 byte .. 50 MB. */
export function isValidPdfSize(sizeBytes: number): boolean {
  return Number.isFinite(sizeBytes) && sizeBytes > 0 && sizeBytes <= PDF_MAX_BYTES;
}

/** Declared MIME gate (server re-validates magic bytes at finalize). */
export function isPdfMimeType(mimeType: string | null | undefined): boolean {
  return mimeType === PDF_MIME_TYPE;
}

/**
 * Read at most `maxBytes` from a fetch Response without buffering the body.
 *
 * Consumes stream chunks only until `maxBytes` is reached, then cancels the
 * reader so a 50 MB response is never loaded into server memory. Returns
 * null when the body is missing/unreadable. Callers must still handle a
 * shorter-than-requested prefix (truncated stream).
 */
export async function readResponsePrefix(
  response: Response,
  maxBytes: number
): Promise<ArrayBuffer | null> {
  try {
    const body = response.body;
    if (!body) return null;
    const reader = body.getReader();
    try {
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.length > 0) {
          const remaining = maxBytes - total;
          if (remaining <= 0) break;
          chunks.push(value.slice(0, remaining));
          total += Math.min(value.length, remaining);
          if (total >= maxBytes) break;
        }
      }
      const out = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
      }
      return out.buffer;
    } finally {
      try {
        await reader.cancel();
      } catch {
        // Reader already closed — prefix bytes already captured.
      }
    }
  } catch {
    return null;
  }
}
