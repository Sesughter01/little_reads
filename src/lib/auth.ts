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
 * Require admin role. Redirects to / if not admin.
 * Uses the authenticated user's own session (anon key) to verify role — never the service-role key.
 */
export async function requireAdmin(): Promise<{ userId: string; profile: Profile }> {
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
    redirect('/admin/login');
  }

  if (profile.role !== 'admin') {
    redirect('/admin/login');
  }

  return { userId: user.id, profile: profile as Profile };
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
