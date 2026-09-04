import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { Plus, BookOpen } from 'lucide-react';
import { ProductActions } from './product-actions';

export default async function AdminProductsPage() {
  await requireAdmin();

  const supabase = await createServiceClient();

  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(name)')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Product</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 hidden sm:table-cell">Category</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Price</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((product) => {
                const category = product.category as unknown as { name: string } | null;
                return (
                  <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                          {product.cover_url ? (
                            <img src={product.cover_url} alt={product.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><BookOpen className="h-4 w-4 text-gray-300" /></div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{product.title}</p>
                          <p className="text-xs text-gray-500">{product.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">{category?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatPrice(product.price)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge text-xs ${
                        product.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {product.published ? 'Published' : 'Draft'}
                      </span>
                      {product.featured && (
                        <span className="badge text-xs bg-orange-100 text-orange-700 ml-1">Featured</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ProductActions productId={product.id} published={product.published} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(!products || products.length === 0) && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products yet. Create your first product!</p>
          </div>
        )}
      </div>
    </div>
  );
}
