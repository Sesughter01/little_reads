import ForgotPasswordClient from './forgot-password-client';

// Dynamic rendering: this page reads `searchParams` (optional email prefill)
// and is always requested fresh after an expired/invalid recovery-link
// redirect. Static prerendering it also trips a Next.js 16 Turbopack
// prerender invariant ("Expected workStore to be initialized"), matching the
// force-dynamic convention already used by /login.
export const dynamic = 'force-dynamic';

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