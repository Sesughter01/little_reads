// Server-side price-display helper — DISPLAY ONLY.
//
// Resolves the display currency for SSR using the documented priority:
//   1. cf-ipcountry
//   2. x-vercel-ip-country
//   3. manual currency preference cookie (lr_currency)
//   4. NGN fallback (unknown country / no preference)
//
// FX rates come from the optional FX_PROVIDER; when no provider is
// configured (or a fetch fails), rates is null and pages must render NGN
// only. NEVER changes checkout amounts.

import { cookies, headers } from 'next/headers';
import { detectCountry, currencyForCountry } from '@/lib/currency';
import { getDisplayRates, type FxRates } from '@/lib/fx';
import { CURRENCY_COOKIE } from '@/lib/currency-preference';

export interface PriceDisplay {
  currency: string;
  rates: FxRates | null;
}

/**
 * Server-side display currency + rates for the current request.
 * Never throws: on any failure it falls back to NGN with no rates.
 */
export async function getPriceDisplay(): Promise<PriceDisplay> {
  try {
    const headerStore = await headers();
    const country = detectCountry(
      {
        'cf-ipcountry': headerStore.get('cf-ipcountry'),
        'x-vercel-ip-country': headerStore.get('x-vercel-ip-country'),
      },
      null
    );

    // Manual preference (cookie) overrides automatic country detection.
    let preference: string | null = null;
    try {
      const cookieStore = await cookies();
      const raw = cookieStore.get(CURRENCY_COOKIE)?.value;
      if (raw) preference = decodeURIComponent(raw);
    } catch {
      preference = null;
    }
    const currency = preference && /^[A-Z]{3}$/.test(preference)
      ? preference
      : (country ? currencyForCountry(country) : 'NGN');

    const rates = currency === 'NGN'
      ? null
      : await getDisplayRates([currency]);

    return { currency, rates };
  } catch {
    return { currency: 'NGN', rates: null };
  }
}