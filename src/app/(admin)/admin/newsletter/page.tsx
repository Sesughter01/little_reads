import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
import { formatDate } from '@/lib/utils';

export default async function AdminNewsletterPage() {
  await requireAdmin();
  const supabase = await createServiceClient();

  const { data: subscribers } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false });

  const activeCount = subscribers?.filter((s) => s.status === 'active').length || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Newsletter</h1>
      <p className="text-sm text-gray-500 mb-6">
        {activeCount} active subscriber{activeCount === 1 ? '' : 's'}
      </p>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Email</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 hidden sm:table-cell">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {subscribers?.map((sub) => (
                <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{sub.email}</td>
                  <td className="px-6 py-4">
                    <span className={`badge text-xs ${
                      sub.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                    {formatDate(sub.subscribed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!subscribers || subscribers.length === 0) && (
          <div className="text-center py-12">
            <p className="text-gray-500">No subscribers yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}