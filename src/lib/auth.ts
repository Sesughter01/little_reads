import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile } from '@/types';

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
