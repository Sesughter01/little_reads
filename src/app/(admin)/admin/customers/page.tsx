import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export default async function AdminCustomersPage() {
  await requireAdmin();
  const supabase = await createServiceClient();

  const { data: customers } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Customers</h1>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Customer</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Email</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 hidden sm:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers?.map((customer) => (
                <tr key={customer.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">
                      {customer.first_name} {customer.last_name}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{customer.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">{formatDate(customer.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!customers || customers.length === 0) && (
          <div className="text-center py-12">
            <p className="text-gray-500">No customers yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
