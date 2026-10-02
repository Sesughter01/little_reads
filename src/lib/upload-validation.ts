/**
 * Upload content validation.
 *
 * The browser-declared Content-Type on a File is fully client-controlled —
 * a attacker (or a buggy client) can rename any payload to "image/png".
 * These helpers verify the ACTUAL bytes via magic numbers before anything
 * is written to storage, and sanitize SVG markup so the public covers
 * bucket can never serve stored XSS.
 */

/** Magic-byte signatures for the raster formats we accept. */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const WEBP_RIFF = Buffer.from('RIFF', 'ascii');
const WEBP_TYPE = Buffer.from('WEBP', 'ascii');

/** Minimum realistic header length before signature probing is meaningful. */
const MIN_SNIFF_BYTES = 12;

/**
 * Detect the real image MIME type from leading bytes.
 * Returns null when the content matches none of the accepted formats.
 */
export function detectImageMimeFromBytes(buffer: ArrayBuffer): string | null {
  if (buffer.byteLength < MIN_SNIFF_BYTES) return null;

  const head = Buffer.from(buffer, 0, Math.max(buffer.byteLength, MIN_SNIFF_BYTES));

  if (head.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    return 'image/png';
  }
  if (head.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC)) {
    return 'image/jpeg';
  }
  if (
    head.subarray(0, WEBP_RIFF.length).equals(WEBP_RIFF) &&
    head.subarray(8, 8 + WEBP_TYPE.length).equals(WEBP_TYPE)
  ) {
    return 'image/webp';
  }
  return null;
}

/** A real PDF starts with "%PDF-" within the first bytes. */
export function validatePdfMagic(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const head = Buffer.from(buffer, 0, 5);
  return head.equals(Buffer.from('%PDF-', 'ascii'));
}

/**
 * SVG sanitization gate.
 *
 * Returns { ok: false } when the SVG contains executable or event-driven
 * content (script elements, inline event handlers, javascript: URLs,
 * foreignObject embedding). The public covers bucket serves these files
 * browser-side, so any script payload would be stored XSS on the storefront
 * domain.
 *
 * The upload path REJECTS dirty SVGs rather than rewriting them: a silently
 * mutated cover could break rendering in confusing ways.
 */
export function sanitizeSvg(
  buffer: ArrayBuffer
): { ok: true } | { ok: false; reason: string } {
  const text = Buffer.from(buffer).toString('utf8');

  // Decode enough entity forms to catch obfuscation like &#106;avascript:.
  let decoded: string;
  try {
    decoded = text
      .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);?/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  } catch {
    return { ok: false, reason: 'unparseable entity' };
  }
  const lowered = decoded.toLowerCase();

  // Strip XML comments first so attack payloads hidden inside them don't
  // cause false negatives... actually comments must NOT hide matches, so
  // we simply scan the raw lowered text including comments.
  if (/<script[\s>]/.test(lowered)) {
    return { ok: false, reason: 'script element' };
  }
  if (/on[a-z0-9_-]+\s*=/.test(lowered)) {
    return { ok: false, reason: 'event handler attribute' };
  }
  if (/javascript\s*:/.test(lowered) || /data\s*:\s*text\/html/.test(lowered)) {
    return { ok: false, reason: 'script URL' };
  }
  if (/<foreignobject[\s>]/.test(lowered)) {
    return { ok: false, reason: 'foreignObject embedding' };
  }
  if (/<(iframe|object|embed|use)[\s>]/.test(lowered)) {
    return { ok: false, reason: 'embedded external element' };
  }

  return { ok: true };
}
