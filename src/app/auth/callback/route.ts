import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Auth callback — processes Supabase PKCE verification links.
 *
 * Flow:
 *   signup email link → /auth/callback?code=... → exchange code for session
 *   → sign out (so the user signs in with their password on /login)
 *   → redirect to /login?verified=1
 *
 * The verification itself is performed by Supabase during the code exchange;
 * the ?verified=1 query parameter is only a UI banner and never proves
 * verification on its own.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Verification succeeded — clear the session so the user signs in with
      // their password, then show the "verified" banner on the login page.
      await supabase.auth.signOut();
      const verifiedUrl = new URL('/login', origin);
      verifiedUrl.searchParams.set('verified', '1');
      verifiedUrl.searchParams.set('next', next);
      return NextResponse.redirect(verifiedUrl);
    }
  }

  // No code or exchange failed — send them to login with an error hint.
  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', 'verification_failed');
  return NextResponse.redirect(loginUrl);
}