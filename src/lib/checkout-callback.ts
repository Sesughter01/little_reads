/**
 * Paystack callback URL construction.
 *
 * The checkout flow used to build the callback_url from the build-time
 * NEXT_PUBLIC_SITE_URL environment variable. That is deployment-fragile:
 * a preview build baked with a Preview origin that is later promoted (or a
 * missing value) sends the customer back to the wrong deployment after
 * paying — where their auth cookie may be absent or Vercel Deployment
 * Protection blocks the return, leaving the order permanently "pending".
 *
 * Instead the callback origin is derived from the ACTUAL incoming request
 * on the server:
 *
 *   request from  https://little-reads.vercel.app
 *     → callback https://little-reads.vercel.app/checkout/success?ref=...
 *   request from a Preview deployment
 *     → callback on that same Preview deployment
 *   localhost dev
 *     → http://localhost:3000 callback
 *
 * Only hosts on the allow-list are trusted (Vercel aliases, the configured
 * production domain, local loopback) — an attacker can never point the
 * callback at an arbitrary foreign host. Fulfillment itself is still gated by
 * authenticated order ownership on /checkout/success, so even a hostile
 * callback target could not grant library access.
 */

type HeaderBag = { get(name: string): string | null };

const LOOPBACK_HOSTS = new Set(['localhost', 'localhost:3000', '127.0.0.1', '127.0.0.1:3000', '[::1]', '[::1]:3000']);

function configuredSiteOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.protocol === 'http:' || url.protocol === 'https:') return configured.replace(/\/+$/, '');
  } catch {
    // Malformed config — ignore; fall through to request-derived origin.
  }
  return null;
}

/**
 * Is this request host permitted as a Paystack callback target?
 *
 * Permitted:
 *  - loopback hosts (local development)
 *  - *.vercel.app aliases (this app's Preview + Production hosts)
 *  - the configured production domain (NEXT_PUBLIC_SITE_URL) and subdomains
 */
export function isAllowedCallbackHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.toLowerCase().trim();

  if (LOOPBACK_HOSTS.has(h)) return true;
  if (h.startsWith('localhost:') || h.startsWith('127.0.0.1:')) return true;

  if (h.endsWith('.vercel.app')) return true;

  const configured = configuredSiteOrigin();
  if (configured) {
    try {
      const c = new URL(configured).host.toLowerCase();
      if (h === c || h.endsWith(`.${c}`)) return true;
    } catch {
      // ignore malformed config
    }
  }
  return false;
}

/**
 * Resolve the callback origin from the current request, falling back to the
 * configured site URL and finally localhost.
 */
export function resolveCallbackOrigin(request: HeaderBag): string {
  const proto =
    request.get('x-forwarded-proto') ||
    (process.env.NODE_ENV === 'development' ? 'http' : 'https');
  const host = (request.get('x-forwarded-host') || request.get('host') || '')
    .toLowerCase()
    .trim();

  if (host && isAllowedCallbackHost(host)) {
    return `${proto}://${host}`;
  }

  // The request host was missing or not on the allow-list — use the explicit
  // configuration, never an arbitrary host.
  return configuredSiteOrigin() || 'http://localhost:3000';
}

/** Build the full Paystack callback URL for an order reference. */
export function buildCheckoutCallbackUrl(
  request: HeaderBag,
  reference: string
): string {
  const origin = resolveCallbackOrigin(request);
  return `${origin}/checkout/success?ref=${encodeURIComponent(reference)}`;
}
