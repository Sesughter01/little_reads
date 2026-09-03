import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
import { formatPrice, formatDate } from '@/lib/utils';
import { DollarSign, ShoppingBag, Users, Package, TrendingUp, Star } from 'lucide-react';

export default async function AdminDashboardPage() {
  // Server-side admin authorization
  await requireAdmin();

  const supabase = await createServiceClient();

  const [
    { count: totalProducts },
    { count: totalOrders },
    { count: totalCustomers },
    { data: paidOrders },
    { data: recentOrders },
    { data: recentReviews },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('orders').select('total').eq('status', 'paid'),
    supabase.from('orders').select('*, items:order_items(*)').order('created_at', { ascending: false }).limit(5),
    supabase.from('reviews').select('*, user:profiles(first_name, last_name), product:products(title)').order('created_at', { ascending: false }).limit(5),
  ]);

  const totalRevenue = paidOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
  const averageOrderValue = paidOrders && paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  const stats = [
    { label: 'Total Revenue', value: formatPrice(totalRevenue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Orders', value: totalOrders || 0, icon: ShoppingBag, color: 'text-purple-700', bg: 'bg-purple-50' },
    { label: 'Customers', value: totalCustomers || 0, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Products', value: totalProducts || 0, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Avg Order Value', value: formatPrice(averageOrderValue), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Paid Orders', value: paidOrders?.length || 0, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h2>
          {recentOrders && recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
                    <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatPrice(order.total)}</p>
                    <span className={`badge text-xs ${
                      order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No orders yet</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Reviews</h2>
          {recentReviews && recentReviews.length > 0 ? (
            <div className="space-y-3">
              {recentReviews.map((review) => {
                const user = review.user as unknown as { first_name: string; last_name: string } | null;
                const product = review.product as unknown as { title: string } | null;
                return (
                  <div key={review.id} className="py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">by {user?.first_name}</span>
                    </div>
                    {review.title && <p className="text-sm font-medium text-gray-900">{review.title}</p>}
                    <p className="text-xs text-gray-500">for {product?.title}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No reviews yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
