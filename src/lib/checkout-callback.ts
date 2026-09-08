/**
 * Paystack callback URL construction.
 *
 * Payment returns are a security-sensitive, production-facing URL. They must
 * not depend on NEXT_PUBLIC_SITE_URL, VERCEL_URL, forwarded production hosts,
 * or a Vercel Preview alias: any of those values can be stale or deployment
 * specific. Little Reads has one canonical public payment return origin.
 *
 * Local development is the sole exception. In development, an actual loopback
 * request is allowed to return to the same local server.
 */

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
 * - production (including Vercel Preview builds): canonical production origin
 * - development + loopback request: the local request origin
 * - development + any non-loopback/forged host: canonical production origin
 */
export function resolveCallbackOrigin(request: HeaderBag): string {
  const forwardedHost = request.get('x-forwarded-host')?.split(',')[0]?.trim();
  const directHost = request.get('host')?.trim();
  const host = forwardedHost || directHost || '';

  if (process.env.NODE_ENV === 'development' && isLocalCallbackHost(host)) {
    const forwardedProto = request
      .get('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim()
      .toLowerCase();
    const protocol = forwardedProto === 'https' ? 'https' : 'http';
    return `${protocol}://${host}`;
  }

  return CANONICAL_SITE_ORIGIN;
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
