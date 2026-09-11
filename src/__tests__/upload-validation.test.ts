import { describe, it, expect } from 'vitest';
import {
  detectImageMimeFromBytes,
  validatePdfMagic,
  sanitizeSvg,
} from '@/lib/upload-validation';

/** Build an ArrayBuffer from a byte array + zero padding. */
function buf(bytes: number[], totalLength = 32): ArrayBuffer {
  const arr = new Uint8Array(totalLength);
  arr.set(bytes, 0);
  return arr.buffer;
}

/** ArrayBuffer from a string — avoids Buffer's shared pool slicing pitfalls. */
function strBuf(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

describe('detectImageMimeFromBytes', () => {
  it('detects a real PNG by magic bytes', () => {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    expect(detectImageMimeFromBytes(buf(png))).toBe('image/png');
  });

  it('detects a real JPEG by magic bytes', () => {
    const jpeg = [0xff, 0xd8, 0xff, 0xe0];
    expect(detectImageMimeFromBytes(buf(jpeg))).toBe('image/jpeg');
  });

  it('detects a real WebP (RIFF/WEBP) by magic bytes', () => {
    const webp = [...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')];
    expect(detectImageMimeFromBytes(buf(webp))).toBe('image/webp');
  });

  it('returns null for spoofed content (text claiming to be an image)', () => {
    expect(
      detectImageMimeFromBytes(strBuf('Hello, this is definitely a PNG image'))
    ).toBeNull();
  });

  it('returns null for buffers too short to sniff', () => {
    expect(detectImageMimeFromBytes(new Uint8Array(4).buffer)).toBeNull();
  });
});

describe('validatePdfMagic', () => {
  it('accepts a real PDF header', () => {
    expect(validatePdfMagic(strBuf('%PDF-1.7 ...'))).toBe(true);
  });

  it('rejects non-PDF content', () => {
    expect(validatePdfMagic(strBuf('Not a pdf at all'))).toBe(false);
    expect(validatePdfMagic(new Uint8Array(2).buffer)).toBe(false);
  });
});

describe('sanitizeSvg', () => {
  it('accepts a clean static SVG', () => {
    expect(
      sanitizeSvg(
        strBuf('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>')
      )
    ).toEqual({ ok: true });
  });

  it('rejects SVG containing a script element', () => {
    expect(sanitizeSvg(strBuf('<svg><script>alert(1)</script></svg>')).ok).toBe(false);
  });

  it('rejects SVG with inline event handlers', () => {
    expect(sanitizeSvg(strBuf('<svg><rect onload="alert(1)" width="10"/></svg>')).ok).toBe(
      false
    );
  });

  it('rejects javascript: URLs including entity-encoded ones', () => {
    expect(sanitizeSvg(strBuf('<svg><a href="javascript:alert(1)">x</a></svg>')).ok).toBe(false);
    expect(sanitizeSvg(strBuf('<svg><a href="&#106;avascript:alert(1)">x</a></svg>')).ok).toBe(
      false
    );
    expect(sanitizeSvg(strBuf('<svg><a href="&#x6A;avascript:alert(1)">x</a></svg>')).ok).toBe(
      false
    );
  });

  it('rejects foreignObject and embedded external elements', () => {
    expect(sanitizeSvg(strBuf('<svg><foreignObject><p>x</p></foreignObject></svg>')).ok).toBe(
      false
    );
    expect(sanitizeSvg(strBuf('<svg><use href="https://evil.example/x.svg"/></svg>')).ok).toBe(
      false
    );
  });
});
