// Client-side currency preference (DISPLAY ONLY — never affects checkout).
// Stored in localStorage and mirrored to a cookie so the server can read the
// preference during SSR without requiring an account.

const LS_KEY = 'littlereads_currency';
export const CURRENCY_COOKIE = 'lr_currency';

export function getPreferredCurrency(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}

export function setPreferredCurrency(currency: string): void {
  if (typeof document === 'undefined') return;
  try {
    window.localStorage.setItem(LS_KEY, currency);
  } catch {
    // localStorage unavailable — cookie still works.
  }
  // 180 days; not httpOnly — it is a non-sensitive display preference.
  document.cookie = `${CURRENCY_COOKIE}=${encodeURIComponent(currency)}; path=/; max-age=${180 * 24 * 60 * 60}; samesite=lax`;
}