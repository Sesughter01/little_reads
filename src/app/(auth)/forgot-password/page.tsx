import ForgotPasswordClient from './forgot-password-client';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string | string[];
  }>;
}) {
  const params = await searchParams;

  const initialEmail =
    typeof params.email === 'string'
      ? params.email
      : '';

  return (
    <ForgotPasswordClient
      initialEmail={initialEmail}
    />
  );
}