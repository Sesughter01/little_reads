import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Library, ShoppingBag, Star, Heart } from 'lucide-react';

export default async function AccountPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  const [{ count: purchasesCount }, { count: ordersCount }, { count: reviewsCount }, { count: wishlistCount }] = await Promise.all([
    supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
    supabase.from('wishlist').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
  ]);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Welcome back, {profile.first_name || 'there'}!
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/account/library" className="card text-center hover:border-purple-700 border-2 border-transparent transition-all">
          <Library className="h-8 w-8 text-purple-700 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{purchasesCount || 0}</p>
          <p className="text-sm text-gray-500">Books</p>
        </Link>
        <Link href="/account/orders" className="card text-center hover:border-orange-500 border-2 border-transparent transition-all">
          <ShoppingBag className="h-8 w-8 text-orange-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{ordersCount || 0}</p>
          <p className="text-sm text-gray-500">Orders</p>
        </Link>
        <Link href="/account/reviews" className="card text-center hover:border-yellow-500 border-2 border-transparent transition-all">
          <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{reviewsCount || 0}</p>
          <p className="text-sm text-gray-500">Reviews</p>
        </Link>
        <Link href="/account/wishlist" className="card text-center hover:border-red-400 border-2 border-transparent transition-all">
          <Heart className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{wishlistCount || 0}</p>
          <p className="text-sm text-gray-500">Wishlist</p>
        </Link>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/shop" className="btn-primary">Browse Books</Link>
          <Link href="/account/library" className="btn-secondary">My Library</Link>
        </div>
      </div>
    </div>
  );
}
