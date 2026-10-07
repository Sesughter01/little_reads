import type { Metadata } from 'next';
import ResetPasswordClient from './reset-password-client';

export const metadata: Metadata = {
  title: 'Reset Password',
};

// Dynamic rendering: this page reads the recovery session client-side and
// the ?admin=1 return hint from the URL. Like /forgot-password, it must
// always render fresh (an expired/used link must show the invalid UI, never
// a stale prerender), and static prerendering risks the Next.js 16
// Turbopack prerender invariant.

/**
 * Password recovery landing page.
 *
 * Deliberately NOT gated: an unauthenticated visitor (expired/used link)
 * must see the page's "invalid link" recovery UI, not a redirect to login —
 * middleware only guards /account, /admin and /checkout, so /reset-password
 * renders freely and its client handles session state.
 */
export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
