import { getUserOrNull } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RegisterClient from './register-client';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const user = await getUserOrNull();
  if (user) {
    redirect('/account');
  }

  return <RegisterClient />;
}
