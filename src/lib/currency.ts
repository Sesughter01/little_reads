// Currency display localization — DISPLAY ONLY.
//
// INVARIANT: the authoritative product price and every Paystack checkout
// amount remain NGN. Nothing in this module may alter checkout amounts.
// Localized currency is presentation only and must always render the NGN
// amount alongside the converted estimate.

export interface CountrySource {
  'cf-ipcountry'?: string | null;
  'x-vercel-ip-country'?: string | null;
}

/** Normalized 2-letter uppercase country code, or null when unknown. */
function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  // Vercel/Cloudflare send XX for unknown and T1 for Tor; both mean "unknown".
  if (v.length !== 2 || v === 'XX' || v === 'T1' || !/^[A-Z]{2}$/.test(v)) {
    return null;
  }
  return v;
}

/**
 * Server-side country detection.
 * Priority: cf-ipcountry → x-vercel-ip-country → user cookie preference → null.
 * Never throws; returns null when no trustworthy signal exists.
 */
export function detectCountry(headers: CountrySource, cookiePreference?: string | null): string | null {
  return (
    normalizeCountry(headers['cf-ipcountry']) ??
    normalizeCountry(headers['x-vercel-ip-country']) ??
    normalizeCountry(cookiePreference)
  );
}

const COUNTRY_CURRENCY: Record<string, string> = {
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', EG: 'EGP',
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS',
  GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR',
  NL: 'EUR', BE: 'EUR', PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR',
  SK: 'EUR', SI: 'EUR', HR: 'EUR', LT: 'EUR', LV: 'EUR', EE: 'EUR',
  CY: 'EUR', MT: 'EUR', LU: 'EUR',
  EU: 'EUR',
  IN: 'INR', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR',
  AU: 'AUD', NZ: 'NZD', JP: 'JPY', CN: 'CNY', HK: 'HKD', SG: 'SGD',
  MY: 'MYR', ID: 'IDR', PH: 'PHP', TH: 'THB', VN: 'VND', KR: 'KRW',
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', IL: 'ILS', TR: 'TRY',
  ZW: 'USD', TZ: 'TZS', UG: 'UGX', RW: 'RWF', ZM: 'ZMW',
};

/** Map a country code to a display currency; unknown countries fall back to NGN. */
export function currencyForCountry(country: string | null | undefined): string {
  const c = normalizeCountry(country);
  if (!c) return 'NGN';
  return COUNTRY_CURRENCY[c] ?? 'NGN';
}

export const SUPPORTED_DISPLAY_CURRENCIES = [
  'NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'CAD', 'INR', 'AED',
] as const;

/** Locale hint for Intl formatting of a display currency. */
function localeFor(currency: string): string {
  switch (currency) {
    case 'NGN': return 'en-NG';
    case 'GBP': return 'en-GB';
    case 'EUR': return 'de-DE';
    case 'INR': return 'en-IN';
    case 'AED': return 'ar-AE';
    default: return 'en-US';
  }
}

/**
 * Format an amount in a currency using Intl.NumberFormat.
 * Rates come from the FX service — NEVER hardcode rates here.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(localeFor(currency), {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' || currency === 'KRW' || currency === 'VND' ? 0 : 2,
    }).format(amount);
  } catch {
    // Unknown currency code — safe numeric fallback with code suffix.
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Existing NGN formatting, kept identical to current behaviour. */
export function formatNgn(amount: number): string {
  return formatMoney(amount, 'NGN');
}
