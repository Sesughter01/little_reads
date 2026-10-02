import { NextConfig } from 'next';

/**
 * Security headers applied to every response.
 *
 * - CSP: script/style sources are pinned; Google Fonts (the only external
 *   runtime dependency, loaded from globals.css) is explicitly allowed.
 *   `unsafe-inline` styles are required by Tailwind runtime class injection
 *   in Next.js; scripts use strict-dynamic via the Next.js nonce mechanism
 *   is NOT enabled here because inline bootstrap scripts would break —
 *   instead script-src pins 'self' + 'unsafe-inline' (Next.js hydration
 *   payload requires it without the nonce middleware, a known tradeoff).
 * - frame-ancestors 'none' (clickjacking) — also mirrored by X-Frame-Options
 *   for legacy clients.
 * - Referrer-Policy and X-Content-Type-Options stop common leak/sniffing
 *   classes; Permissions-Policy disables powerful browser features.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Next.js hydration + Paystack redirect flows need inline handlers limited
  // to inline scripts/styles actually emitted by the framework.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co https://api.paystack.co",
  "frame-src 'self' https://checkout.paystack.com",
  "form-action 'self' https://checkout.paystack.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP_DIRECTIVES },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
};

export default nextConfig;
