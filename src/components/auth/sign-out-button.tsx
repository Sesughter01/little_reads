'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { resolveSignOutDestination } from '@/lib/sign-out';

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

  const handleSignOut = async () => {
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