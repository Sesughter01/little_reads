import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  PDF_BUCKET,
  PDF_MAX_BYTES,
  getPdfStoragePath,
  getStagedPdfPath,
  isManagedPdfPath,
  isPdfMimeType,
  isValidPdfSize,
  isValidStagedUploadId,
  readResponsePrefix,
} from '@/lib/pdf-upload';
import { validatePdfMagic } from '@/lib/upload-validation';

const readSrc = (relative: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf-8');

describe('pdf-upload pure helpers', () => {
  it('derives the canonical storage path from the product id only', () => {
    expect(getPdfStoragePath('abc-123')).toBe('abc-123.pdf');
    expect(PDF_BUCKET).toBe('ebook-files');
  });

  it('derives staged paths server-side from product id + upload id', () => {
    const uploadId = 'a'.repeat(32);
    expect(getStagedPdfPath('abc-123', uploadId)).toBe(
      `staging/abc-123/${uploadId}.pdf`
    );
  });

  it('accepts only strict server-issued upload ids', () => {
    expect(isValidStagedUploadId('a'.repeat(32))).toBe(true);
    expect(isValidStagedUploadId('0123456789abcdef0123456789abcdef')).toBe(true);
    expect(isValidStagedUploadId(null)).toBe(false);
    expect(isValidStagedUploadId(undefined)).toBe(false);
    expect(isValidStagedUploadId('')).toBe(false);
    expect(isValidStagedUploadId('../abc')).toBe(false);
    expect(isValidStagedUploadId('a'.repeat(31))).toBe(false);
    expect(isValidStagedUploadId('A'.repeat(32))).toBe(false);
    expect(isValidStagedUploadId('abc/../../etc')).toBe(false);
    expect(isValidStagedUploadId('ebook-files/x.pdf')).toBe(false);
  });

  it('caps size at 50 MB', () => {
    expect(PDF_MAX_BYTES).toBe(50 * 1024 * 1024);
    expect(isValidPdfSize(1)).toBe(true);
    expect(isValidPdfSize(50 * 1024 * 1024)).toBe(true);
    expect(isValidPdfSize(50 * 1024 * 1024 + 1)).toBe(false);
    expect(isValidPdfSize(0)).toBe(false);
    expect(isValidPdfSize(NaN)).toBe(false);
  });

  it('only accepts the PDF mime type', () => {
    expect(isPdfMimeType('application/pdf')).toBe(true);
    expect(isPdfMimeType('image/png')).toBe(false);
    expect(isPdfMimeType(null)).toBe(false);
  });

  it('rejects fake PDFs by magic bytes', () => {
    const real = new TextEncoder().encode('%PDF-1.7 fake body').buffer as ArrayBuffer;
    const fake = new TextEncoder().encode('PNG! not a pdf').buffer as ArrayBuffer;
    expect(validatePdfMagic(real)).toBe(true);
    expect(validatePdfMagic(fake)).toBe(false);
  });
});

describe('isManagedPdfPath (cleanup allowlist)', () => {
  const id = '123e4567-e89b-12d3-a456-426614174000';
  const staged = `staging/${id}/${'b'.repeat(32)}.pdf`;

  it('accepts this product’s legacy canonical and staged paths', () => {
    expect(isManagedPdfPath(id, `${id}.pdf`)).toBe(true);
    expect(isManagedPdfPath(id, staged)).toBe(true);
  });

  it('rejects everything else — never auto-delete foreign objects', () => {
    expect(isManagedPdfPath(id, null)).toBe(false);
    expect(isManagedPdfPath(id, '')).toBe(false);
    expect(isManagedPdfPath(id, 'generated/ebooks/seed.pdf')).toBe(false);
    expect(isManagedPdfPath(id, 'other-product.pdf')).toBe(false);
    expect(isManagedPdfPath(id, `staging/other-id/${'b'.repeat(32)}.pdf`)).toBe(false);
    expect(isManagedPdfPath(id, `staging/${id}/short.pdf`)).toBe(false);
    expect(isManagedPdfPath(id, `staging/${id}/${'B'.repeat(32)}.pdf`)).toBe(false);
    expect(isManagedPdfPath(id, `${id}.pdf.bak`)).toBe(false);
    expect(isManagedPdfPath(id, `../${id}.pdf`)).toBe(false);
  });
});

describe('readResponsePrefix (constant-memory prefix reads)', () => {
  function streamResponse(chunks: Uint8Array[]): Response {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of chunks) controller.enqueue(c);
        controller.close();
      },
    });
    return new Response(stream, { status: 200 });
  }

  it('reads only the first bytes of a large body', async () => {
    const big = new Uint8Array(5 * 1024 * 1024).fill(0x41);
    new TextEncoder().encodeInto('%PDF-', big);
    const res = streamResponse([big]);
    const prefix = await readResponsePrefix(res, 5);
    expect(prefix).not.toBeNull();
    expect(prefix!.byteLength).toBe(5);
    expect(Buffer.from(prefix!).toString('ascii')).toBe('%PDF-');
  });

  it('assembles a prefix split across many small chunks', async () => {
    const res = streamResponse([
      new Uint8Array([0x25, 0x50]),
      new Uint8Array([0x44, 0x46, 0x2d]),
      new Uint8Array([0x99, 0x99]),
    ]);
    const prefix = await readResponsePrefix(res, 5);
    expect(prefix).not.toBeNull();
    expect(Buffer.from(prefix!).toString('ascii')).toBe('%PDF-');
  });

  it('returns a short prefix for truncated bodies instead of throwing', async () => {
    const res = streamResponse([new Uint8Array([0x25, 0x50])]);
    const prefix = await readResponsePrefix(res, 5);
    expect(prefix).not.toBeNull();
    expect(prefix!.byteLength).toBe(2);
  });

  it('returns null when the body is missing', async () => {
    const res = new Response(null, { status: 200 });
    await expect(readResponsePrefix(res, 5)).resolves.toBeNull();
  });
});

describe('pdf direct-upload authorization route (staged)', () => {
  it('requires admin, verifies the product, and stages under a fresh upload id', () => {
    const route = readSrc('app/api/admin/products/[id]/pdf-upload-url/route.ts');
    expect(route).toContain('requireAdminApi()');
    expect(route).toContain('getStagedPdfPath(id, uploadId)');
    expect(route).toContain('createSignedUploadUrl');
    // Unique staged object per attempt: no upsert, so a token can never
    // overwrite the canonical file or another staged upload.
    expect(route).not.toMatch(/createSignedUploadUrl\(stagedPath,\s*\{\s*upsert/);
    // No client-supplied path: the request body carries only size + mime.
    expect(route).toContain('sizeBytes');
    expect(route).not.toMatch(/body\??\.(path|filePath|key|bucket|uploadId)/);
    // Service-role key never leaves the server; only a scoped token is returned.
    expect(route).toContain('token: data.token');
    expect(route).not.toContain('SERVICE_ROLE_KEY!');
  });

  it('rejects >50MB at authorization time', () => {
    const route = readSrc('app/api/admin/products/[id]/pdf-upload-url/route.ts');
    expect(route).toContain('isValidPdfSize(sizeBytes)');
    expect(route).toContain('Product not found');
  });
});

describe('pdf finalize route (pointer swap, no byte copy)', () => {
  it('never full-downloads, copies, or moves: size from metadata, magic from a byte range', () => {
    const route = readSrc('app/api/admin/products/[id]/pdf-finalize/route.ts');
    expect(route).toContain('requireAdminApi()');
    // No full-object download, no byte transfer anywhere in finalize.
    expect(route).not.toContain('.download(');
    expect(route).not.toContain('.copy(');
    expect(route).not.toContain('.move(');
    // Size from listing metadata.
    expect(route).toContain('.list(');
    expect(route).toContain('metadata');
    // First bytes via short-lived signed read url + Range, stream-capped.
    expect(route).toContain('createSignedUrl');
    expect(route).toContain("Range");
    expect(route).toContain('readResponsePrefix');
    expect(route).toContain('validatePdfMagic');
  });

  it('accepts only a validated upload id and re-derives the staged path', () => {
    const route = readSrc('app/api/admin/products/[id]/pdf-finalize/route.ts');
    expect(route).toContain('isValidStagedUploadId(uploadId)');
    expect(route).toContain('getStagedPdfPath(id, uploadId');
    expect(route).not.toMatch(/body\??\.(path|filePath|key|bucket)/);
    // Signed read url is server-side only.
    expect(route).not.toContain('signedUrl:');
  });

  it('pointer-swaps on success; invalid candidate deleted, old path kept', () => {
    const route = readSrc('app/api/admin/products/[id]/pdf-finalize/route.ts');
    // Valid candidate → DB points at the staged object itself.
    expect(route).toContain('pdf_path: stagedPath');
    // Invalid candidate → staged removed (both failure branches); the
    // previous object is removed only post-success behind the allowlist
    // gate — never on any failure path, never for unrecognized paths.
    expect(route.match(/\.remove\(\[stagedPath\]\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(route).toContain('previousPath !== stagedPath && isManagedPdfPath(id, previousPath)');
    // DB failure → old pdf_path stays active (update is the swap; staged
    // remains for retry; the previous object is never deleted first).
    expect(route).toContain('Upload validated but product update failed');
    // Cleanup is best-effort, allowlisted, and never fails the upload.
    expect(route).toContain('isManagedPdfPath(id, previousPath)');
    // Keeps the private bucket private (no public URL minted).
    expect(route).not.toContain('getPublicUrl');
  });

  it('legacy canonical books are replaceable; unknown paths never deleted', () => {
    const route = readSrc('app/api/admin/products/[id]/pdf-finalize/route.ts');
    // Legacy `{id}.pdf` needs no migration: the swap works from any
    // previous pdf_path value, and cleanup only touches allowlisted paths.
    expect(route).toContain('previousPath !== stagedPath');
    expect(route).toContain('isManagedPdfPath');
  });
});

describe('legacy assets route: PDFs disabled, covers intact', () => {
  it('POST type=pdf returns 410 before any byte is read or stored', () => {
    const route = readSrc('app/api/admin/products/[id]/assets/route.ts');
    expect(route).toContain('410');
    expect(route).toContain('Direct PDF upload is required');
    // No PDF upload, validation, or POST reference-write remains (DELETE
    // still removes staged/canonical PDFs and nulls pdf_path, by design).
    expect(route).not.toContain('`${id}.pdf`');
    expect(route).not.toContain('validatePdfMagic');
    expect(route).not.toContain('updateData.pdf_path = filePath');
    // Cover flow untouched.
    expect(route).toContain('ebook-covers');
    expect(route).toContain('detectImageMimeFromBytes');
    expect(route).toContain('sanitizeSvg');
    expect(route).toContain('cover_url');
  });
});

describe('admin editor uses the staged flow with safe parsing', () => {
  it('uploads PDFs via authorize → direct → finalize(uploadId) and never bare response.json()', () => {
    const client = readSrc('app/(admin)/admin/products/[id]/edit/edit-product-client.tsx');
    expect(client).toContain('pdf-upload-url');
    expect(client).toContain('uploadToSignedUrl');
    expect(client).toContain('pdf-finalize');
    expect(client).toContain('uploadId: authData.uploadId');
    expect(client).toContain('readApiError');
    expect(client).toContain('parseApiJson');
    expect(client).not.toMatch(/await response\.json\(\)/);
    expect(client).not.toMatch(/await res\.json\(\)/);
  });
});

describe('POST /assets type=pdf → 410 (runtime)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function postAssets(type: string) {
    const authModule = await import('@/lib/auth');
    vi.spyOn(authModule, 'requireAdminApi').mockResolvedValue({
      ok: true,
      userId: 'admin-1',
      profile: { role: 'admin' },
    } as never);
    const { POST } = await import(
      '@/app/api/admin/products/[id]/assets/route'
    );
    const form = new FormData();
    form.append('type', type);
    form.append('file', new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' }), 'x.pdf');
    const req = new Request('http://localhost/api/admin/products/p1/assets', {
      method: 'POST',
      body: form,
    });
    return POST(req as never, { params: Promise.resolve({ id: 'p1' }) });
  }

  it('rejects proxied PDFs with 410 and an instructive error', async () => {
    const res = await postAssets('pdf');
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toMatch(/direct pdf upload/i);
  });
});
