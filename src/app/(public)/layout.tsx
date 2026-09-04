import { StoreShell } from '@/components/layout/store-shell';

/**
 * Public storefront chrome: Header + <main> + Footer.
 * Covers the home page, /shop, /categories, /books, /cart, /checkout,
 * content pages — never the admin panel.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StoreShell>{children}</StoreShell>;
}
