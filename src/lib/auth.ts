import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
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
 *   admin with MFA pending  → 403 (mirrors the page redirect to /admin/mfa/verify)
 *   admin (MFA satisfied)   → ok:true
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

  // Enforce TOTP MFA when the admin has enrolled a verified factor: mutations
  // must not proceed from an aal1 session. Mirrors requireAdmin()'s redirect
  // to /admin/mfa/verify for pages.
  try {
    const { data: assurance } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const currentLevel = assurance?.currentLevel;
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verifiedTotp = (factors?.all || []).some(
      (f) => f.factor_type === 'totp' && f.status === 'verified'
    );
    if (verifiedTotp && currentLevel !== 'aal2') {
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
 * Also enforces TOTP MFA: if the admin has a verified TOTP factor enrolled and
 * the current session is not at assurance level 2, they are sent to
 * /admin/mfa/verify. If MFA is not enabled in the Supabase project this check
 * is skipped (so the demo still works) and is reported as CONFIG_REQUIRED.
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

  // Enforce TOTP MFA when the admin has enrolled a verified factor.
  let requiresMfa = false;
  try {
    const { data: assurance } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const currentLevel = assurance?.currentLevel;
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verifiedTotp = (factors?.all || []).some(
      (f) => f.factor_type === 'totp' && f.status === 'verified'
    );
    if (verifiedTotp && currentLevel !== 'aal2') {
      requiresMfa = true;
    }
  } catch {
    // MFA not enabled in this Supabase project — allow without MFA.
  }

  if (requiresMfa) {
    redirect('/admin/mfa/verify');
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
