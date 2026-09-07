import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Server-side admin guard (defense-in-depth on top of middleware).
 *
 * This layout deliberately renders NO chrome of its own: the admin top bar,
 * sidebar and <main> are provided exactly once by the client layout at
 * `(admin)/admin/layout.tsx`, which Next.js applies to every `/admin/*` route.
 * Importing that layout here as well would render the admin chrome twice.
 */
export default async function AdminGuardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return <>{children}</>;
}
