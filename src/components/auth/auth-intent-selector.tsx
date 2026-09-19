'use client';

import { BookOpen, PenLine } from 'lucide-react';
import { AUTH_INTENT_LABELS, type AuthIntent } from '@/lib/auth-intent';

/**
 * Buy Books / Sell Books intent selector — the ONE authentication system's
 * intent control, shared by BOTH the login and the register page.
 *
 * This is a UI hint only. It:
 *   * is stored per-tab by the caller (sessionStorage), never as a role,
 *   * is never sent to Supabase and never read by a server authorization check,
 *   * grants nothing: approval still happens only in the admin review flow, and
 *     the authoritative seller state always comes from GET /api/seller/access.
 *
 * A hand-edited `?sell=/intent/approved` can therefore only change which SAFE
 * destination a user navigates to after signing in — see lib/auth-intent.ts.
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
  const options: { intent: AuthIntent; description: string; Icon: typeof BookOpen }[] = [
    { intent: 'buy', description: 'Shop and read children\u2019s books', Icon: BookOpen },
    { intent: 'sell', description: 'Publish your own books', Icon: PenLine },
  ];

  return (
    <fieldset className="mb-6" disabled={disabled}>
      <legend className="label mb-2 block">What would you like to do?</legend>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account purpose">
        {options.map(({ intent, description, Icon }) => {
          const selected = value === intent;
          return (
            <label
              key={intent}
              htmlFor={`${idPrefix}-${intent}`}
              className={`cursor-pointer rounded-xl border-2 p-3 text-left transition-colors ${
                selected
                  ? 'border-brand-purple bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {/* A real radio keeps keyboard/AT semantics; the input is visually
                  hidden behind the styled tile. */}
              <input
                type="radio"
                id={`${idPrefix}-${intent}`}
                name={idPrefix}
                value={intent}
                checked={selected}
                onChange={() => onChange(intent)}
                className="sr-only"
              />
              <span className="flex items-center gap-2">
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    selected ? 'text-brand-purple' : 'text-gray-400'
                  }`}
                />
                <span className="font-semibold text-gray-900">{AUTH_INTENT_LABELS[intent]}</span>
              </span>
              <span className="mt-1 block text-xs text-gray-500">{description}</span>
            </label>
          );
        })}
      </div>
      {value === 'sell' && (
        <p className="mt-2 text-xs text-gray-500">
          Author accounts are reviewed by our team. You can keep shopping as a normal customer
          while you wait.
        </p>
      )}
    </fieldset>
  );
}