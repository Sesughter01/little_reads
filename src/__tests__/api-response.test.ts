import { describe, it, expect } from 'vitest';
import {
  isJsonResponse,
  parseApiJson,
  readApiError,
} from '@/lib/api-response';

function makeResponse(
  body: string | null,
  init: { status?: number; contentType?: string } = {}
): Response {
  const headers = new Headers();
  if (init.contentType) headers.set('content-type', init.contentType);
  return new Response(body, { status: init.status ?? 200, headers });
}

describe('isJsonResponse', () => {
  it('detects JSON with charset suffix', () => {
    expect(
      isJsonResponse(makeResponse('{}', { contentType: 'application/json; charset=utf-8' }))
    ).toBe(true);
  });

  it('rejects HTML and text', () => {
    expect(isJsonResponse(makeResponse('<html>', { contentType: 'text/html' }))).toBe(false);
    expect(isJsonResponse(makeResponse('x', { status: 413 }))).toBe(false);
  });
});

describe('parseApiJson', () => {
  it('parses a JSON error body', async () => {
    const res = makeResponse(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
      contentType: 'application/json',
    });
    expect(await parseApiJson<{ error: string }>(res)).toEqual({
      error: 'No file provided',
    });
  });

  it('returns null for HTML platform errors instead of throwing', async () => {
    const res = makeResponse('<html><body>413 Payload Too Large</body></html>', {
      status: 413,
      contentType: 'text/html',
    });
    await expect(parseApiJson(res)).resolves.toBeNull();
  });

  it('returns null for empty bodies instead of throwing', async () => {
    const res = makeResponse(null, { status: 502 });
    await expect(parseApiJson(res)).resolves.toBeNull();
  });
});

describe('readApiError', () => {
  it('prefers the JSON error field', async () => {
    const res = makeResponse(JSON.stringify({ error: 'Invalid file type. Only PDF allowed' }), {
      status: 400,
      contentType: 'application/json',
    });
    expect(await readApiError(res)).toBe('Invalid file type. Only PDF allowed');
  });

  it('maps a 413 HTML page to a meaningful message', async () => {
    const res = makeResponse('<html>Payload Too Large</html>', {
      status: 413,
      contentType: 'text/html',
    });
    const message = await readApiError(res);
    expect(message.toLowerCase()).toContain('too large');
    expect(message).not.toContain('<html>');
  });

  it('returns plain-text errors trimmed', async () => {
    const res = makeResponse('  Upstream failed  ', {
      status: 502,
      contentType: 'text/plain',
    });
    expect(await readApiError(res)).toBe('Upstream failed');
  });

  it('falls back sensibly for empty bodies', async () => {
    const res = makeResponse(null, { status: 500 });
    expect(await readApiError(res)).toBe('Server error. Please try again in a moment.');
  });

  it('never surfaces raw HTML doctype pages', async () => {
    const res = makeResponse('<!DOCTYPE html><html></html>', {
      status: 413,
      contentType: 'text/html',
    });
    const message = await readApiError(res);
    expect(message).not.toContain('DOCTYPE');
  });
});
