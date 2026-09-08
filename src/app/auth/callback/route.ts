import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Supabase PKCE auth callback.
 *
 * Handles:
 *
 * 1. Email verification
 *    Supabase -> /auth/callback?code=...
 *    -> exchange code
 *    -> sign user out
 *    -> /login?verified=1
 *
 * 2. Password recovery
 *    Supabase -> /auth/callback?code=...&next=/reset-password
 *    -> exchange code
 *    -> KEEP recovery session
 *    -> /reset-password
 *
 * The recovery session is required so reset-password can call:
 *
 * supabase.auth.updateUser({
 *   password: newPassword,
 * })
 */

function getSafeNext(value: string | null): string | null {
  if (!value) {
    return null;
  }

  /**
   * Only allow internal application paths.
   *
   * Prevent:
   * ?next=https://malicious-site.com
   * ?next=//malicious-site.com
   */
  if (!value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  return value;
}

function getSiteOrigin(requestUrl: URL): string {
  /**
   * Prefer the configured site URL.
   *
   * Production:
   * NEXT_PUBLIC_SITE_URL=https://littlereads.com.ng
   *
   * Local:
   * NEXT_PUBLIC_SITE_URL=http://localhost:3000
   *
   * No localhost or production domain is hardcoded here.
   */
  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');

  if (configuredSiteUrl) {
    try {
      return new URL(configuredSiteUrl).origin;
    } catch {
      console.error(
        'Invalid NEXT_PUBLIC_SITE_URL configuration.'
      );
    }
  }

  /**
   * Safe fallback to the origin that received the callback.
   */
  return requestUrl.origin;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');

  const requestedNext = getSafeNext(
    requestUrl.searchParams.get('next')
  );

  const siteOrigin = getSiteOrigin(requestUrl);

  /**
   * We control the recovery redirect by sending:
   *
   * /auth/callback?next=/reset-password
   *
   * Supabase may also provide type=recovery in some callback flows,
   * so support that as an additional signal.
   */
  const isPasswordRecovery =
    requestedNext === '/reset-password' ||
    type === 'recovery';

  if (!code) {
    console.error('Auth callback received without a code.');

    if (isPasswordRecovery) {
      const forgotPasswordUrl = new URL(
        '/forgot-password',
        siteOrigin
      );

      forgotPasswordUrl.searchParams.set(
        'error',
        'invalid_recovery_link'
      );

      return NextResponse.redirect(forgotPasswordUrl);
    }

    const loginUrl = new URL('/login', siteOrigin);

    loginUrl.searchParams.set(
      'error',
      'verification_failed'
    );

    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error(
      'Supabase auth code exchange failed:',
      error.message
    );

    if (isPasswordRecovery) {
      const forgotPasswordUrl = new URL(
        '/forgot-password',
        siteOrigin
      );

      forgotPasswordUrl.searchParams.set(
        'error',
        'invalid_recovery_link'
      );

      return NextResponse.redirect(forgotPasswordUrl);
    }

    const loginUrl = new URL('/login', siteOrigin);

    loginUrl.searchParams.set(
      'error',
      'verification_failed'
    );

    return NextResponse.redirect(loginUrl);
  }

  /**
   * PASSWORD RECOVERY
   *
   * IMPORTANT:
   * Do NOT sign out here.
   *
   * exchangeCodeForSession() creates the authenticated recovery
   * session needed by:
   *
   * supabase.auth.updateUser({
   *   password: newPassword
   * })
   */
  if (isPasswordRecovery) {
    if (!data.session) {
      console.error(
        'Recovery callback exchanged successfully but no session was created.'
      );

      const forgotPasswordUrl = new URL(
        '/forgot-password',
        siteOrigin
      );

      forgotPasswordUrl.searchParams.set(
        'error',
        'recovery_session_missing'
      );

      return NextResponse.redirect(forgotPasswordUrl);
    }

    return NextResponse.redirect(
      new URL('/reset-password', siteOrigin)
    );
  }

  /**
   * EMAIL VERIFICATION
   *
   * Supabase has now verified the email and exchangeCodeForSession()
   * temporarily created a session.
   *
   * LittleReads requires the customer to sign in normally after
   * verification, so remove that temporary session.
   */
  await supabase.auth.signOut();

  const loginUrl = new URL('/login', siteOrigin);

  loginUrl.searchParams.set('verified', '1');

  /**
   * Preserve a safe destination where applicable.
   *
   * Example:
   * /login?verified=1&next=/checkout
   */
  if (
    requestedNext &&
    requestedNext !== '/' &&
    requestedNext !== '/reset-password'
  ) {
    loginUrl.searchParams.set('next', requestedNext);
  }

  return NextResponse.redirect(loginUrl);
}