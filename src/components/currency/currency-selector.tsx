'use client';

import { useEffect, useState } from 'react';
import {
  getPreferredCurrency,
  setPreferredCurrency,
} from '@/lib/currency-preference';
import { SUPPORTED_DISPLAY_CURRENCIES } from '@/lib/currency';

/**
 * Manual currency selector — DISPLAY ONLY. Writes a non-secret cookie +
 * localStorage preference (never an account requirement) and never affects
 * the authoritative NGN checkout amount. Placed in the site footer so it
 * does not clutter mobile navigation.
 */
export function CurrencySelector() {
  const [currency, setCurrency] = useState<string>('NGN');

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration-safe read of the local preference on mount */
  useEffect(() => {
    setCurrency(getPreferredCurrency() ?? 'NGN');
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-400">
      <span className="text-xs">Display</span>
      <select
        aria-label="Display currency"
        className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 focus:border-brand-orange focus:outline-none"
        value={currency}
        onChange={(e) => {
          const next = e.target.value;
          setCurrency(next);
          setPreferredCurrency(next);
          // Re-render any LocalizedPrice on the page without a full reload,
          // and persist for SSR on the next navigation.
          try {
            window.dispatchEvent(new Event('littlereads-currency-changed'));
          } catch {
            // event dispatch best-effort
          }
        }}
      >
        {SUPPORTED_DISPLAY_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}