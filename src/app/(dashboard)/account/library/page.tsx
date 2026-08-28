import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { BookOpen, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function LibraryPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  const { data: purchases } = await supabase
    .from('purchases')
    .select('*, product:products(id, title, slug, cover_url, author, pdf_path)')
    .eq('user_id', profile.id)
    .order('purchased_at', { ascending: false });

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">My Library</h2>

      {purchases && purchases.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {purchases.map((purchase) => {
            const product = purchase.product as unknown as {
              id: string;
              title: string;
              slug: string;
              cover_url: string | null;
              author: string;
              pdf_path: string | null;
            } | null;

            if (!product) return null;

            return (
              <div key={purchase.id} className="card p-4">
                <div className="flex gap-4">
                  <Link href={`/books/${product.slug}`} className="shrink-0">
                    <div className="relative w-20 h-28 rounded-lg overflow-hidden bg-gray-100">
                      {product.cover_url ? (
                        <img src={product.cover_url} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/books/${product.slug}`}
                      className="font-semibold text-gray-900 hover:text-purple-700 transition-colors block truncate"
                    >
                      {product.title}
                    </Link>
                    <p className="text-sm text-gray-500">{product.author}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Purchased {formatDate(purchase.purchased_at)}
                    </p>
                    {product.pdf_path ? (
                      <a
                        href={`/api/ebooks/${product.id}/download`}
                        className="inline-flex items-center gap-1 mt-2 text-sm text-purple-700 font-medium hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        Download PDF
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400 mt-2 block">PDF not available</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Your library is waiting for its first adventure
          </h3>
          <p className="text-gray-500 mb-6">
            Purchase ebooks to start building your collection.
          </p>
          <Link href="/shop" className="btn-primary">
            Explore Books
          </Link>
        </div>
      )}
    </div>
  );
}
