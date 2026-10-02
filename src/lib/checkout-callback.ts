/**
 * Paystack callback URL construction.
 *
 * Callback routing is keyed to the CONFIGURED PAYSTACK KEY MODE, not to
 * NODE_ENV or the Vercel environment name ("route by key mode"):
 *
 * - LIVE mode (production only): every payment return goes to the one
 *   canonical public origin. Live keys are scoped to the Production Vercel
 *   environment, so this path is production-only by construction.
 * - TEST mode: the payment return goes back to the origin that actually
 *   served the checkout request — a Vercel Preview alias, or the explicitly
 *   allowed local loopback in development. Preview runs TEST keys and shares
 *   Production's database, so a TEST order must return to the deployment the
 *   buyer started from, never to the live production domain.
 *
 * The request host is only ever reflected for TEST-mode returns.
 * NEXT_PUBLIC_SITE_URL, VERCEL_URL and stale env values are never trusted,
 * and the LIVE origin stays pinned regardless of request headers. When the
 * key configuration is unusable (MISSING/PLACEHOLDER/INVALID), routing fails
 * closed to the canonical production origin.
 */

import { getPaystackMode } from '@/lib/paystack';

type HeaderBag = { get(name: string): string | null };

/** The verified production domain documented and deployed for Little Reads. */
export const CANONICAL_SITE_ORIGIN = 'https://littlereads.com.ng';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

function hostnameFromHost(host: string): string | null {
  try {
    return new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isLocalCallbackHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = hostnameFromHost(host.trim().toLowerCase());
  return hostname !== null && LOOPBACK_HOSTNAMES.has(hostname);
}

/**
 * Resolve the public origin used in Paystack's callback_url.
 *
 * - TEST key mode + development + loopback request: the local request origin
 *   (the explicitly allowed local test-payment return target)
 * - TEST key mode otherwise (e.g. Vercel Preview with sk_test_): the origin
 *   that served the request, so preview buyers return to the preview
 *   deployment that started the payment
 * - LIVE key mode (production only): the canonical production origin, always
 *   — request headers and stale env values can never redirect a LIVE return
 * - anything unusable (missing/placeholder/invalid keys): the canonical
 *   production origin, so a misconfiguration fails closed
 */
export function resolveCallbackOrigin(request: HeaderBag): string {
  const forwardedHost = request.get('x-forwarded-host')?.split(',')[0]?.trim();
  const directHost = request.get('host')?.trim();
  const host = forwardedHost || directHost || '';

  if (getPaystackMode() === 'TEST' && host) {
    const forwardedProto = request
      .get('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim()
      .toLowerCase();
    const protocol = forwardedProto === 'https' ? 'https' : 'http';

    // Local development: the explicitly allowed loopback return target.
    if (process.env.NODE_ENV === 'development' && isLocalCallbackHost(host)) {
      return `${protocol}://${host.toLowerCase()}`;
    }

    // TEST mode elsewhere (e.g. a Vercel Preview deployment): return to the
    // deployment that served the checkout request.
    const origin = normalizeCallbackOrigin(host, protocol);
    if (origin) return origin;
  }

  return CANONICAL_SITE_ORIGIN;
}

/**
 * Normalize a request host into a strict origin for TEST-mode callbacks:
 * the protocol is https only when explicitly forwarded via x-forwarded-proto,
 * and the host is lowercased. The parsed hostname must be usable or the host
 * is rejected (fail closed to the canonical origin).
 */
function normalizeCallbackOrigin(
  host: string,
  protocol: 'http' | 'https'
): string | null {
  const hostname = hostnameFromHost(host);
  if (!hostname) return null;
  return `${protocol}://${host.trim().toLowerCase()}`;
}

/** Build the full Paystack callback URL for an order reference. */
export function buildCheckoutCallbackUrl(
  request: HeaderBag,
  reference: string
): string {
  const url = new URL('/checkout/success', resolveCallbackOrigin(request));
  url.searchParams.set('ref', reference);
  return url.toString();
}
