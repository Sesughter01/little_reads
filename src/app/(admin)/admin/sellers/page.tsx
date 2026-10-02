import { requireAdmin } from '@/lib/auth';
import { SellersClient } from './sellers-client';

/**
 * /admin/sellers — seller application moderation dashboard.
 *
 * Server-guarded (requireAdmin). The client component loads applications via
 * the admin API and approves/rejects/suspends through
 * PATCH /api/admin/sellers/[id], which stamps approved_by/approved_at
 * server-side — the browser can never set approval state directly.
 */
export default async function AdminSellersPage() {
  await requireAdmin();
  return <SellersClient />;
}
