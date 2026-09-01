import { requireAdmin } from '@/lib/auth';
import AdminLayout from './admin/layout';

/**
 * Server-side admin guard.
 * Verifies the user has admin role before rendering the admin client layout.
 * This is the defense-in-depth layer on top of middleware protection.
 */
export default async function AdminGuardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return <AdminLayout>{children}</AdminLayout>;
}
