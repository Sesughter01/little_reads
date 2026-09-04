import { Header } from './header';
import { Footer } from './footer';

/**
 * Public storefront shell: one Header, one <main>, one Footer.
 * Used by the (public), (auth) and (dashboard) route-group layouts so the
 * public chrome is never rendered inside admin routes.
 */
export function StoreShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
