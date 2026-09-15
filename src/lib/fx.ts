// Exchange-rate provider abstraction — SERVER-SIDE ONLY.
//
// INVARIANT: NGN is the authoritative base currency. Rates here are used for
// DISPLAY ONLY and must never influence checkout amounts.
//
// Configuration (all optional):
//   FX_PROVIDER   – "openexchangerates" | "exchangerate-host" (future providers)
//   FX_API_KEY    – provider API key (never exposed to the browser)
//   FX_BASE_URL   – optional override for self-hosted/proxied endpoints
//
// If no provider is configured, or a fetch fails/times out, the caller must
// fall back to displaying NGN only. NO invented or stale default rates.

export interface FxRates {
  /** rate[currency] = amount of that currency per 1 NGN */
  rates: Record<string, number>;
  fetchedAt: number;
}

export interface FxProvider {
  /** Human-readable provider name for logs. */
  readonly name: string;
  /** Fetch latest NGN-based rates for the given currency codes. */
  fetchRates(currencies: string[]): Promise<FxRates>;
}

const FETCH_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function env(name: string): string | undefined {
  // Access lazily so importing this module in tests without env stays safe.
  return process.env[name];
}

class OpenExchangeRatesProvider implements FxProvider {
  readonly name = 'openexchangerates';

  async fetchRates(currencies: string[]): Promise<FxRates> {
    const appId = env('FX_API_KEY');
    if (!appId) throw new Error('FX_API_KEY not configured');
    const base = env('FX_BASE_URL') ?? 'https://openexchangerates.org/api';
    // openexchangerates supports base currency on paid plans; NGN base is
    // achieved by requesting USD base and inverting.
    const url = `${base}/latest.json?app_id=${encodeURIComponent(appId)}&base=USD`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`openexchangerates HTTP ${res.status}`);
    const json = (await res.json()) as { rates?: Record<string, number> };
    if (!json?.rates?.NGN) throw new Error('openexchangerates: NGN rate missing');
    // Convert USD-based table to NGN-based: rate[CUR] per 1 NGN.
    const ngnPerUsd = json.rates.NGN;
    const rates: Record<string, number> = { NGN: 1 };
    for (const cur of currencies) {
      const usd = json.rates[cur];
      if (typeof usd === 'number' && usd > 0) {
        rates[cur] = usd / ngnPerUsd;
      }
    }
    return { rates, fetchedAt: Date.now() };
  }
}

class ExchangeRateHostProvider implements FxProvider {
  readonly name = 'exchangerate-host';

  async fetchRates(currencies: string[]): Promise<FxRates> {
    const key = env('FX_API_KEY');
    const base = env('FX_BASE_URL') ?? 'https://api.exchangerate.host';
    const url = key
      ? `${base}/latest?access_key=${encodeURIComponent(key)}&base=NGN`
      : `${base}/latest?base=NGN`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`exchangerate-host HTTP ${res.status}`);
    const json = (await res.json()) as { rates?: Record<string, number> };
    if (!json?.rates) throw new Error('exchangerate-host: rates missing');
    const rates: Record<string, number> = { NGN: 1 };
    for (const cur of currencies) {
      const r = json.rates[cur];
      if (typeof r === 'number' && r > 0) rates[cur] = r;
    }
    return { rates, fetchedAt: Date.now() };
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
}

function resolveProvider(): FxProvider | null {
  const provider = env('FX_PROVIDER');
  if (!provider) return null;
  switch (provider.trim().toLowerCase()) {
    case 'openexchangerates':
      return new OpenExchangeRatesProvider();
    case 'exchangerate-host':
      return new ExchangeRateHostProvider();
    default:
      return null;
  }
}

// Module-level cache: one fetch per server instance per TTL.
let cache: FxRates | null = null;
let inflight: Promise<FxRates | null> | null = null;

/**
 * Get NGN-based display rates. Returns null when no provider is configured,
 * the request fails, or times out — callers must then display NGN only.
 * Never throws.
 */
export async function getDisplayRates(currencies: string[]): Promise<FxRates | null> {
  const provider = resolveProvider();
  if (!provider) return null;
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache;
  if (!inflight) {
    inflight = provider
      .fetchRates(currencies)
      .then((r) => {
        cache = r;
        return r;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Convert an NGN amount for display. Returns null when conversion is unavailable. */
export function convertFromNgn(amountNgn: number, currency: string, rates: FxRates | null): number | null {
  if (!rates) return null;
  if (currency === 'NGN') return amountNgn;
  const rate = rates.rates[currency];
  if (typeof rate !== 'number' || rate <= 0 || !Number.isFinite(rate)) return null;
  return amountNgn * rate;
}

/** Test-only helper: reset the module cache. */
export function __resetFxCacheForTests(): void {
  cache = null;
  inflight = null;
}

/** Test-only helper: inject cache contents. */
export function __setFxCacheForTests(rates: FxRates | null): void {
  cache = rates;
}