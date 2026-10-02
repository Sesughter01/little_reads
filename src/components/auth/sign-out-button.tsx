'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { resolveSignOutDestination } from '@/lib/sign-out';
import { useClickGuard } from '@/lib/click-guard';

interface SignOutButtonProps {
  /** Visual variant */
  variant?: 'sidebar' | 'inline';
  /** Optional label override */
  label?: string;
  /** Where to send the user after sign-out. Defaults to / for customer contexts. */
  redirectTo?: string;
}
export function SignOutButton({ variant = 'sidebar', label = 'Sign Out', redirectTo }: SignOutButtonProps) {
  const router = useRouter();
  const destination = resolveSignOutDestination(redirectTo);
  const signOutGuard = useClickGuard();

  const handleSignOut = async () => {
    // Synchronous guard: rapid repeated clicks fire sign out once. Ends in
    // navigation — no release needed.
    if (!signOutGuard.claim()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace(destination);
  };

  if (variant === 'inline') {
    return (
      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left transition-colors"
      >
        <LogOut className="h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left transition-colors"
    >
      <LogOut className="h-5 w-5" />
      {label}
    </button>
  );
}