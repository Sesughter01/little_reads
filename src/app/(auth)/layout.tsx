import type { Metadata } from 'next';
import { StoreShell } from '@/components/layout/store-shell';

export const metadata: Metadata = {
  title: {
    default: 'Account',
    template: '%s | LittleReads',
  },
};

/**
 * Customer auth pages (login, register, verify email, OTP) keep the public
 * storefront chrome so users can navigate back to the store.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <StoreShell>{children}</StoreShell>;
}
