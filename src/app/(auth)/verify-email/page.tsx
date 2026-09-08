import VerifyEmailClient from './verify-email-client';

// Auth pages are session-dependent; also avoids a Next 16 build-worker
// prerender invariant failure on this route ("Expected workStore to be initialized").
export const dynamic = 'force-dynamic';

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}