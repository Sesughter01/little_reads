import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const supabase = await createServiceClient();
  const { data: categories } = await supabase.from('categories').select('*').order('name');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Categories</h1>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Slug</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 hidden sm:table-cell">Description</th>
              </tr>
            </thead>
            <tbody>
              {categories?.map((cat) => (
                <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{cat.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{cat.slug}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">{cat.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
