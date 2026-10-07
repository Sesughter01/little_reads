import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isAdminMfaRequired } from '@/lib/admin-mfa-policy';
import type { Profile } from '@/types';

/**
 * Result of an API-safe admin authorization check.
 *
 * ok:true   → the caller is an authenticated admin (MFA satisfied);
 *             `userId`/`profile` are available.
 * ok:false  → the caller must be rejected with the given HTTP status and
 *             message. 401 = not authenticated, 403 = authenticated but not
 *             an admin (or MFA verification still outstanding).
 */
export type AdminApiAuth =
  | { ok: true; userId: string; profile: Profile }
  | { ok: false; status: 401 | 403; error: string };

/**
 * API-safe admin guard.
 *
 * Unlike requireAdmin() (which calls Next.js redirect() for pages and throws
 * NEXT_REDIRECT when used inside route handlers), this guard NEVER redirects
 * and NEVER throws for authorization failures. It returns a typed result that
 * route handlers turn into proper HTTP responses:
 *
 *   not authenticated      → 401
 *   authenticated non-admin → 403
 *   admin, MFA required, no verified TOTP → 403 MFA enrollment required
 *   admin, MFA required, verified TOTP but aal1 → 403 MFA verification required
 *   admin (MFA satisfied or not required)   → ok:true
 *
 * Role is always verified server-side from profiles.role — never from the
 * browser, localStorage or request body.
 */
export async function requireAdminApi(): Promise<AdminApiAuth> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: 'Not authenticated' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, status: 401, error: 'Not authenticated' };
  }

  if (profile.role !== 'admin') {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  // Enforce TOTP MFA ONLY when the explicit server policy requires it.
  // Default (ADMIN_MFA_REQUIRED unset/false): password login works normally.
  // When required, BOTH enrollment and verification are enforced: an admin
  // with no verified TOTP factor gets MFA enrollment required, and an admin
  // with a verified factor but an aal1 session gets MFA verification
  // required. Role is always checked first — MFA never grants admin.
  if (!isAdminMfaRequired()) {
    return { ok: true, userId: user.id, profile: profile as Profile };
  }
  try {
    const { data: assurance } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const currentLevel = assurance?.currentLevel;
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verifiedTotp = (factors?.all || []).some(
      (f) => f.factor_type === 'totp' && f.status === 'verified'
    );
    if (!verifiedTotp) {
      return { ok: false, status: 403, error: 'MFA enrollment required' };
    }
    if (currentLevel !== 'aal2') {
      return { ok: false, status: 403, error: 'MFA verification required' };
    }
  } catch {
    // MFA not enabled in this Supabase project — allow without MFA.
  }

  return { ok: true, userId: user.id, profile: profile as Profile };
}

/**
 * Result of an API-safe customer authorization check.
 *
 * ok:true   → the caller is an authenticated user; `userId`/`profile` are
 *             available from the SERVER session — never from the browser.
 * ok:false  → reject with 401 (not authenticated).
 */
export type UserApiAuth =
  | { ok: true; userId: string; profile: Profile }
  | { ok: false; status: 401; error: string };

/**
 * API-safe customer guard.
 *
 * Like requireAdminApi(), this NEVER calls Next.js redirect() and NEVER throws
 * for authentication failures — it returns a typed 401 result so route
 * handlers can respond with proper JSON instead of letting NEXT_REDIRECT be
 * swallowed by a catch block and turned into a 500.
 *
 * The authenticated user ID always comes from the Supabase server session.
 */
export async function requireUserApi(): Promise<UserApiAuth> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: 'Not authenticated' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, status: 401, error: 'Not authenticated' };
  }

  return { ok: true, userId: user.id, profile: profile as Profile };
}

/**
 * Require an authenticated user. Redirects to /login if not authenticated.
 * Returns the authenticated user and their profile.
 */
export async function requireUser(): Promise<{ userId: string; profile: Profile }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/login');
  }

  return { userId: user.id, profile: profile as Profile };
}

/**
 * Require admin role.
 * Uses the authenticated user's own session (anon key) to verify role — never the service-role key.
 *
 * TOTP MFA is enforced ONLY when ADMIN_MFA_REQUIRED=true (server-only flag,
 * default off). When required, an admin with no verified TOTP factor is sent
 * to /admin/mfa/setup (even on direct navigation to /admin or any other
 * protected admin page), and an admin with a verified factor but an aal1
 * session is sent to /admin/mfa/verify. The /admin/mfa/* pages themselves do
 * not use this guard (they use requireAdminInProgress), so no redirect loop
 * is possible.
 */
export async function requireAdmin(): Promise<{ userId: string; profile: Profile }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/admin/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/admin/login');
  }

  if (profile.role !== 'admin') {
    redirect('/admin/login');
  }

  // Enforce TOTP MFA ONLY when the explicit server policy requires it.
  // Enrollment AND verification are both enforced here (not just in the
  // login flow), so direct navigation to /admin cannot bypass setup.
  // Setup/verify pages are exempt by construction: they authenticate via
  // requireAdminInProgress() and never call this guard.
  if (isAdminMfaRequired()) {
    let destination: '/admin/mfa/setup' | '/admin/mfa/verify' | null = null;
    try {
      const { data: assurance } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const currentLevel = assurance?.currentLevel;
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedTotp = (factors?.all || []).some(
        (f) => f.factor_type === 'totp' && f.status === 'verified'
      );
      if (!verifiedTotp) {
        destination = '/admin/mfa/setup';
      } else if (currentLevel !== 'aal2') {
        destination = '/admin/mfa/verify';
      }
    } catch {
      // MFA not enabled in this Supabase project — allow without MFA.
    }

    if (destination) {
      redirect(destination);
    }
  }

  return { userId: user.id, profile: profile as Profile };
}

/**
 * Verify the caller is an authenticated admin WITHOUT enforcing TOTP MFA.
 * Used by the /admin/mfa/* pages and /api/admin/mfa/* endpoints while admin
 * authentication is still in progress (enrollment / verification).
 *
 * Returns the Supabase client, user id and profile on success, or null when
 * the caller is not an authenticated admin.
 */
export async function requireAdminInProgress(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  profile: Profile;
} | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') return null;

  return { supabase, userId: user.id, profile: profile as Profile };
}

/**
 * Check if user is authenticated (does not redirect).
 */
export async function getUserOrNull(): Promise<{ userId: string; profile: Profile } | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    return { userId: user.id, profile: profile as Profile };
  } catch {
    return null;
  }
}
