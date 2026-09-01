import { getUserOrNull } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginClient from './login-client';

export default async function LoginPage() {
  const user = await getUserOrNull();
  if (user) {
    redirect('/account');
  }

  return <LoginClient />;
}
