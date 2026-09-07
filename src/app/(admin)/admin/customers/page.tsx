import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { formatDate, formatPrice } from '@/lib/utils';

interface CustomerRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export default async function AdminCustomersPage() {
  await requireAdmin();
  const supabase = await createServiceClient();

  const [{ data: customers }, { data: orders }, { data: purchases }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false }),
      supabase.from('orders').select('user_id, total, status'),
      supabase.from('purchases').select('user_id'),
    ]);

  const orderStats = new Map<
    string,
    { orders: number; paidOrders: number; spent: number }
  >();
  for (const order of orders || []) {
    if (!order.user_id) continue;
    const stat = orderStats.get(order.user_id) || {
      orders: 0,
      paidOrders: 0,
      spent: 0,
    };
    stat.orders += 1;
    if (order.status === 'paid') {
      stat.paidOrders += 1;
      stat.spent += order.total || 0;
    }
    orderStats.set(order.user_id, stat);
  }

  const purchaseCounts = new Map<string, number>();
  for (const purchase of purchases || []) {
    purchaseCounts.set(
      purchase.user_id,
      (purchaseCounts.get(purchase.user_id) || 0) + 1
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Customers</h1>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Customer</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 hidden sm:table-cell">Joined</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 hidden md:table-cell">Orders</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 hidden lg:table-cell">Books Owned</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {customers?.map((customer) => {
                const stats = orderStats.get(customer.id);
                return (
                  <tr key={customer.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-orange-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {customer.first_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 group-hover:text-brand-purple">
                            {customer.first_name} {customer.last_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {customer.email}
                            {customer.phone ? ` · ${customer.phone}` : ''}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                      {formatDate(customer.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                      {stats?.orders || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">
                      {purchaseCounts.get(customer.id) || 0}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatPrice(stats?.spent || 0)}
                    </td>
                  </tr>
                );
              })}
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