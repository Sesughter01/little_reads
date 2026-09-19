'use client';

import { AUTH_INTENT_LABELS, type AuthIntent } from '@/lib/auth-intent';
import { ShoppingBag, PenLine } from 'lucide-react';

const INTENTS: AuthIntent[] = ['buy', 'sell'];

const ICONS = {
  buy: ShoppingBag,
  sell: PenLine,
} as const;

const HINTS: Record<AuthIntent, string> = {
  buy: 'Shop picture books, ebooks and bundles.',
  sell: 'Publish your own books as an author — subject to admin approval.',
};

/**
 * Buyer / seller INTENT selector for the one shared Login and Register pages.
 *
 * This is a UI hint ONLY. It is never sent to Supabase, never stored as a
 * role, and never read by any server authorization check — it only decides
 * which safe destination to navigate to after authentication. Seller
 * privileges stay admin-controlled (see src/lib/auth-intent.ts).
 */
export default function AuthIntentSelector({
  value,
  onChange,
  disabled = false,
  idPrefix = 'auth-intent',
}: {
  value: AuthIntent;
  onChange: (intent: AuthIntent) => void;
  disabled?: boolean;
  idPrefix?: string;
}) {
  return (
    <div className="mb-6">
      <p id={`${idPrefix}-label`} className="label text-center">
        I want to
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${idPrefix}-label`}
        className="grid grid-cols-2 gap-3"
      >
        {INTENTS.map((intent) => {
          const Icon = ICONS[intent];
          const selected = value === intent;
          return (
            <button
              key={intent}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(intent)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
                selected
                  ? 'border-brand-purple bg-brand-purple/5 text-brand-purple'
                  : 'border-gray-200 text-gray-500 hover:border-brand-purple/40 hover:text-gray-700'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {AUTH_INTENT_LABELS[intent]}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-gray-400">{HINTS[value]}</p>
    </div>
  );
}