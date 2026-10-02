/**
 * LittleReads Geo Worker — coarse country detection (DISPLAY ONLY).
 *
 * Returns ONLY the visitor's country code (2-letter uppercase, or "XX" when
 * unknown). Never returns latitude/longitude, city, or any precise location.
 *
 * This worker is OPTIONAL. The application works without it (server-side
 * detection falls back to Vercel headers / cookie / NGN).
 *
 * SECURITY NOTES:
 *  - No secrets, no API keys, no PII stored or persisted.
 *  - The response is a single plain-text country code, safe to expose.
 */

export interface Env {
  // Optional: restrict to a single allowed origin for CORS preflight.
  ALLOWED_ORIGIN?: string;
}

const SAFE_ORIGIN = 'https://little-reads.vercel.app';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(env.ALLOWED_ORIGIN),
      });
    }

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // request.cf is a Cloudflare-specific extension (null outside real
    // zones); typed defensively so the worker compiles outside Cloudflare.
    const requestWithCf = request as Request & { cf?: { country?: string } };
    const country = requestWithCf.cf?.country;

    // Normalize: only 2-letter codes are accepted; unknown markers become XX.
    const code =
      typeof country === 'string' && /^[A-Za-z]{2}$/.test(country)
        ? country.toUpperCase()
        : 'XX';

    return new Response(JSON.stringify({ country: code }), {
      headers: {
        ...corsHeaders(env.ALLOWED_ORIGIN),
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  },
} as const;

function corsHeaders(allowedOrigin?: string): Record<string, string> {
  const origin = allowedOrigin || SAFE_ORIGIN;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}