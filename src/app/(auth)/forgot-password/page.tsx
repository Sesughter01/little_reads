import { getUserOrNull } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ForgotPasswordClient from './forgot-password-client';

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  const user = await getUserOrNull();
  if (user) {
    redirect('/account');
  }

  return <ForgotPasswordClient />;
}
