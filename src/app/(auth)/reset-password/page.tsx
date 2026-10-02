import type { Metadata } from 'next';
import ResetPasswordClient from './reset-password-client';

export const metadata: Metadata = {
  title: 'Reset Password',
};

/**
 * Password recovery landing page.
 *
 * Deliberately NOT gated: an unauthenticated visitor (expired/used link)
 * must see the page's "invalid link" recovery UI, not a redirect to login —
 * middleware only guards /account, /admin and /checkout, so /reset-password
 * renders freely and its client handles session state.
 */
export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
