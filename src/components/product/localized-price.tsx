'use client';

// LocalizedPrice — DISPLAY-ONLY localized currency rendering.
//
// The authoritative amount is ALWAYS NGN. When a converted estimate is
// unavailable (no FX provider, FX failure, or unknown rate) the component
// falls back to the NGN amount alone. Checkout amounts are never derived
// from this component.

import { useEffect, useMemo, useState } from 'react';
import { formatMoney } from '@/lib/currency';
import { getPreferredCurrency } from '@/lib/currency-preference';

interface Props {
  /** Authoritative amount in NGN (major units, matching product.price). */
  amountNgn: number;
  /** Rates: currency → amount per 1 NGN. Null/absent → NGN-only display. */
  rates?: Record<string, number> | null;
  /** Force a specific display currency (e.g. server-detected). Optional. */
  currency?: string | null;
  className?: string;
}

export default function LocalizedPrice({ amountNgn, rates, currency, className }: Props) {
  const [manual, setManual] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration-safe read of the preference on mount; the listener updates run asynchronously */
  useEffect(() => {
    setManual(getPreferredCurrency());
    const onChange = () => {
      setManual(getPreferredCurrency());
      setRevision((r) => r + 1);
    };
    window.addEventListener('littlereads-currency-changed', onChange);
    return () => window.removeEventListener('littlereads-currency-changed', onChange);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  void revision; // re-render when the footer selector changes the preference

  const display = manual ?? currency ?? null;
  const converted = useMemo(() => {
    if (!display || display === 'NGN') return null;
    const rate = rates?.[display];
    if (typeof rate !== 'number' || rate <= 0) return null;
    return amountNgn * rate;
  }, [amountNgn, display, rates]);

  if (!converted) {
    return <span className={className}>{formatMoney(amountNgn, 'NGN')}</span>;
  }

  return (
    <span className={className}>
      <span>{formatMoney(converted, display!)}</span>{' '}
      <span className="text-xs opacity-70">≈ {formatMoney(amountNgn, 'NGN')}</span>
    </span>
  );
}