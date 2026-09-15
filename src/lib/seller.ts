// Seller capability authorization — SERVER-SIDE ONLY.
//
// Design: "seller" is a capability, not a profiles.role value. The existing
// profiles.role CHECK constraint ('customer'|'admin') is untouched; seller
// state lives in seller_profiles (created by Migration 007, not yet applied).
// Client input can NEVER grant seller status — approval is admin/service-only.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface SellerProfile {
  user_id: string;
  display_name: string;
  business_name: string | null;
  bio: string | null;
  status: SellerStatus;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Load the seller profile for the session user. Returns null when
 * unauthenticated or when no seller profile exists.
 */
export async function getSellerProfile(): Promise<SellerProfile | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;
  const { data, error } = await supabase
    .from('seller_profiles')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as SellerProfile;
}

/** Session user id, or null when unauthenticated. */
export async function getSessionUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

/**
 * API-safe seller guard (mirrors requireAdminApi).
 *
 * Never redirects and never throws for authorization failures — returns a
 * typed result route handlers turn into HTTP responses:
 *
 *   401 not authenticated
 *   403 authenticated but no seller profile, or not approved
 *
 * The seller is derived from the SERVER session (createClient uses request
 * cookies), never from the request body or query params.
 */
export type SellerApiAuth =
  | { ok: true; userId: string; profile: SellerProfile }
  | { ok: false; status: 401 | 403; error: string };

export async function requireSellerApi(): Promise<SellerApiAuth> {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) {
    return { ok: false, status: 401, error: 'Not authenticated' };
  }
  const { data, error } = await supabase
    .from('seller_profiles')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (error || !data || (data as SellerProfile).status !== 'approved') {
    return { ok: false, status: 403, error: 'Seller access required' };
  }
  return {
    ok: true,
    userId: userData.user.id,
    profile: data as SellerProfile,
  };
}

export type SellerAccess =
  | { state: 'anonymous' }
  | { state: 'no-profile' }
  | { state: 'pending'; profile: SellerProfile }
  | { state: 'rejected'; profile: SellerProfile }
  | { state: 'suspended'; profile: SellerProfile }
  | { state: 'approved'; profile: SellerProfile };

/** Full seller access evaluation for the current session. Never throws. */
export async function getSellerAccess(): Promise<SellerAccess> {
  const userId = await getSessionUserId();
  if (!userId) return { state: 'anonymous' };
  const profile = await getSellerProfile();
  if (!profile) return { state: 'no-profile' };
  switch (profile.status) {
    case 'approved':
      return { state: 'approved', profile };
    case 'pending':
      return { state: 'pending', profile };
    case 'rejected':
      return { state: 'rejected', profile };
    case 'suspended':
      return { state: 'suspended', profile };
    default:
      return { state: 'no-profile' };
  }
}

/**
 * Server-side guard for /seller dashboard routes. Redirects according to the
 * access state; only approved sellers reach the dashboard. This is the
 * authoritative check — never rely on hidden UI.
 */
export async function requireApprovedSeller(): Promise<SellerProfile> {
  const access = await getSellerAccess();
  switch (access.state) {
    case 'anonymous':
      redirect('/login?redirect=/seller');
    case 'no-profile':
      redirect('/seller/onboarding');
    case 'pending':
      redirect('/seller/pending');
    case 'rejected':
    case 'suspended':
      redirect('/seller/status');
    case 'approved':
      return access.profile;
  }
}