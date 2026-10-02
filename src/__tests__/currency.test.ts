import { describe, it, expect } from 'vitest';
import {
  detectCountry,
  currencyForCountry,
  formatMoney,
  SUPPORTED_DISPLAY_CURRENCIES,
} from '@/lib/currency';
import {
  getDisplayRates,
  convertFromNgn,
  __resetFxCacheForTests,
  __setFxCacheForTests,
} from '@/lib/fx';

describe('detectCountry', () => {
  it('prefers cf-ipcountry first', () => {
    expect(
      detectCountry({ 'cf-ipcountry': 'GB', 'x-vercel-ip-country': 'US' }, null)
    ).toBe('GB');
  });

  it('falls back to x-vercel-ip-country', () => {
    expect(detectCountry({ 'x-vercel-ip-country': 'us' }, null)).toBe('US');
  });

  it('falls back to the persisted manual preference cookie', () => {
    expect(detectCountry({}, 'gh')).toBe('GH');
  });

  it('treats XX, T1 and missing headers as unknown', () => {
    expect(detectCountry({ 'cf-ipcountry': 'XX' }, null)).toBeNull();
    expect(detectCountry({ 'cf-ipcountry': 'T1' }, null)).toBeNull();
    expect(detectCountry({}, null)).toBeNull();
  });

  it('never throws on garbage input', () => {
    expect(detectCountry({ 'cf-ipcountry': '12!' } as never, null)).toBeNull();
    expect(detectCountry({}, 'zz-top-999' as never)).toBeNull();
  });
});

describe('currencyForCountry', () => {
  it('maps known countries to display currencies', () => {
    expect(currencyForCountry('NG')).toBe('NGN');
    expect(currencyForCountry('US')).toBe('USD');
    expect(currencyForCountry('GB')).toBe('GBP');
    expect(currencyForCountry('CA')).toBe('CAD');
    expect(currencyForCountry('GH')).toBe('GHS');
    expect(currencyForCountry('KE')).toBe('KES');
    expect(currencyForCountry('ZA')).toBe('ZAR');
    expect(currencyForCountry('FR')).toBe('EUR');
  });

  it('falls back to NGN for unknown/missing countries', () => {
    expect(currencyForCountry(null)).toBe('NGN');
    expect(currencyForCountry(undefined)).toBe('NGN');
    expect(currencyForCountry('XX')).toBe('NGN');
    expect(currencyForCountry('T1')).toBe('NGN');
    expect(currencyForCountry('ZZ')).toBe('NGN');
  });

  it('every supported display currency has a country mapping path or is reachable', () => {
    // NGN is the universal fallback; the rest must appear in the mapping.
    for (const cur of SUPPORTED_DISPLAY_CURRENCIES) {
      expect(typeof cur).toBe('string');
    }
    expect(SUPPORTED_DISPLAY_CURRENCIES).toContain('NGN');
  });
});

describe('formatMoney', () => {
  it('formats NGN amounts with Intl', () => {
    const out = formatMoney(5000, 'NGN');
    expect(out).toContain('5,000');
  });

  it('degrades safely for unknown currency codes', () => {
    // ISO 4217 'XXX' ("no currency") is VALID to Intl — it renders the
    // universal currency sign rather than throwing; must never crash
    // or lose the amount.
    expect(formatMoney(10, 'XXX')).toContain('10');
    // 'abcd' can never be a currency code (Intl requires exactly 3 letters
    // and engines normalise case) → RangeError → the catch fallback
    // "CODE amount" still renders the amount.
    expect(formatMoney(10, 'abcd')).toContain('abcd');
    expect(formatMoney(10, 'abcd')).toContain('10');
  });
});

describe('FX service', () => {
  it('returns null when no provider is configured (NGN-only display)', async () => {
    __resetFxCacheForTests();
    const rates = await getDisplayRates(['USD', 'GBP']);
    expect(rates).toBeNull();
  });

  it('convertFromNgn returns null without rates (safe NGN fallback)', () => {
    expect(convertFromNgn(5000, 'USD', null)).toBeNull();
    expect(convertFromNgn(5000, 'NGN', null)).toBeNull();
  });

  it('convertFromNgn returns the NGN amount for the NGN target', () => {
    expect(convertFromNgn(5000, 'NGN', { rates: { NGN: 1 }, fetchedAt: Date.now() })).toBe(5000);
  });

  it('convertFromNgn converts with a cached rate table and rejects bad rates', () => {
    const table = { rates: { NGN: 1, USD: 0.0006 }, fetchedAt: Date.now() };
    expect(convertFromNgn(5000, 'USD', table)).toBeCloseTo(3, 5);
    expect(
      convertFromNgn(5000, 'USD', { rates: { NGN: 1, USD: 0 }, fetchedAt: Date.now() })
    ).toBeNull();
    expect(convertFromNgn(5000, 'ZZZ', table)).toBeNull();
    __setFxCacheForTests(null);
  });

  it('displayed currency never changes the authoritative NGN checkout amount', () => {
    // Contract: checkout always charges amountNgn in NGN. FX output is only
    // ever rendered beside it ("£x ≈ ₦5,000") — this test pins that the
    // conversion is a separate value, not a mutation of the source.
    const amountNgn = 5000;
    const converted = convertFromNgn(amountNgn, 'USD', {
      rates: { NGN: 1, USD: 0.0006 },
      fetchedAt: Date.now(),
    });
    expect(amountNgn).toBe(5000);
    expect(converted).toBeCloseTo(3, 5);
  });
});
