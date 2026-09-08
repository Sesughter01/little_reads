import AdminLoginClient from './admin-login-client';

// Auth pages are session-dependent; also avoids a Next 16 build-worker
// prerender invariant failure on this route ("Expected workStore to be initialized").
export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return <AdminLoginClient />;
}
