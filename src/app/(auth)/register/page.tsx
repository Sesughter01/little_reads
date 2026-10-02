import { getUserOrNull } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RegisterClient from './register-client';

export const dynamic = 'force-dynamic';

/**
 * ONE customer registration page for the one authentication system.
 *
 * There is no Buy/Sell selector and no seller intent: registering here creates
 * a normal customer account, and the destination afterwards is the validated
 * `?redirect=` candidate (e.g. checkout recovery) or /account. Author access
 * stays a separate, admin-approved journey that starts at /seller/onboarding.
 */
export default async function RegisterPage() {
  const user = await getUserOrNull();
  if (user) {
    redirect('/account');
  }

  return <RegisterClient />;
}
