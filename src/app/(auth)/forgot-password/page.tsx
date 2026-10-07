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
    admin?: string | string[];
  }>;
}) {
  const params = await searchParams;

  const initialEmail =
    typeof params.email === 'string'
      ? params.email
      : '';

  // Admin recovery shares the Supabase flow but returns to /admin/login.
  // Any value other than exactly '1' is treated as a customer flow so an
  // attacker cannot smuggle arbitrary destinations through this param.
  const isAdmin = params.admin === '1';

  return (
    <ForgotPasswordClient
      initialEmail={initialEmail}
      isAdmin={isAdmin}
    />
  );
}