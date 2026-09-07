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
 * Only hosts on the allow-list are trusted (the code-pinned production
 * domains, Vercel aliases, local loopback, and any extra hosts added via
 * ALLOWED_CALLBACK_HOSTS) — an attacker can never point the callback at an
 * arbitrary foreign host. Fulfillment itself is still gated by authenticated
 * order ownership on /checkout/success, so even a hostile callback target
 * could not grant library access.
 *
 * The production domains are pinned IN CODE (DEFAULT_PINNED_HOSTS) because
 * the original failure was itself a configuration failure: a deployment had
 * NEXT_PUBLIC_SITE_URL pointed at a foreign domain, customers were sent back
 * there after paying, and the order stayed pending because the success-page
 * reconcile never ran. Correctness must not depend on env vars being right.
 * ALLOWED_CALLBACK_HOSTS (comma-separated) only EXTENDS the trusted list.
 */

type HeaderBag = { get(name: string): string | null };

const LOOPBACK_HOSTS = new Set(['localhost', 'localhost:3000', '127.0.0.1', '127.0.0.1:3000', '[::1]', '[::1]:3000']);

/**
 * This app's known production domains, pinned in code as a safe default.
 *
 * Rationale: the callback failure that motivated this module was itself a
 * CONFIGURATION failure (a stale NEXT_PUBLIC_SITE_URL pointing at a foreign
 * domain). Making the correct callback depend on more configuration would
 * repeat the same mistake, so the production domain is baked in here and
 * ALLOWED_CALLBACK_HOSTS only EXTENDS the list (e.g. for staging domains).
 */
const DEFAULT_PINNED_HOSTS = ['littlereads.com.ng', 'www.littlereads.com.ng'];

/**
 * Trusted callback hosts: the code-pinned production domains plus any
 * extra hosts from ALLOWED_CALLBACK_HOSTS (comma-separated; schemes/ports
 * are stripped).
 */
export function getAllowedCallbackHosts(): string[] {
  const raw = process.env.ALLOWED_CALLBACK_HOSTS?.trim() || '';
  const extra = raw
    .split(',')
    .map((h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '')
    )
    .filter(Boolean);
  return [...new Set([...DEFAULT_PINNED_HOSTS, ...extra])];
}

/**
 * The trusted fallback origin for the callback.
 *
 * Preference order:
 *   1. Code-pinned production domain (DEFAULT_PINNED_HOSTS[0])
 *   2. ALLOWED_CALLBACK_HOSTS first extra entry, if any
 *   3. NEXT_PUBLIC_SITE_URL (legacy/backwards compatible)
 *
 * A code-pinned domain wins because a stale/misconfigured NEXT_PUBLIC_SITE_URL
 * must never steer the payment return to a foreign host — the order would
 * stay pending forever (the exact production incident this module exists for).
 */
function configuredSiteOrigin(): string | null {
  const pinned = DEFAULT_PINNED_HOSTS[0];
  if (pinned) return `https://${pinned}`;

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
 *  - the code-pinned production domains (DEFAULT_PINNED_HOSTS)
 *  - loopback hosts (local development)
 *  - *.vercel.app aliases (this app's Preview + Production hosts)
 *  - extra hosts pinned in ALLOWED_CALLBACK_HOSTS (exact match)
 *  - the configured production domain (NEXT_PUBLIC_SITE_URL) and subdomains
 */
export function isAllowedCallbackHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.toLowerCase().trim();

  if (LOOPBACK_HOSTS.has(h)) return true;
  if (h.startsWith('localhost:') || h.startsWith('127.0.0.1:')) return true;

  if (h.endsWith('.vercel.app')) return true;

  if (getAllowedCallbackHosts().includes(h)) return true;

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
