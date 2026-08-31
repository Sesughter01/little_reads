import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Account',
    template: '%s | LittleReads',
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
