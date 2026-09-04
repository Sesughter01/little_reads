import { StoreShell } from '@/components/layout/store-shell';

export const dynamic = 'force-dynamic';

/**
 * Customer account pages keep the public storefront chrome (Header/Footer);
 * the account sub-navigation is provided by (dashboard)/account/layout.tsx.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StoreShell>{children}</StoreShell>;
}
