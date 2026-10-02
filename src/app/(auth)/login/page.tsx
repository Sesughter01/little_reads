import { getUserOrNull } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginClient from './login-client';

export const dynamic = 'force-dynamic';

/**
 * ONE customer login page for the one authentication system.
 *
 * There is no Buy/Sell selector and no seller intent: this is the normal
 * customer sign-in, and the destination after sign-in is the validated
 * `?redirect=`/`?next=` candidate (middleware / callback) or /account. Becoming
 * an author is a separate journey that starts at /seller/onboarding.
 */
export default async function LoginPage() {
  const user = await getUserOrNull();
  if (user) {
    redirect('/account');
  }

  return <LoginClient />;
}
