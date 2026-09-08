import Link from 'next/link';
import { SearchX, SlidersHorizontal } from 'lucide-react';
import { ShopFilters } from '@/components/product/shop-filters';
import { BookCard } from '@/components/product/book-card';
import type { Product } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shop',
  description: 'Browse our collection of educational children\'s ebooks',
};

async function safeGetProducts(params?: {
  category?: string;
  search?: string;
  sort?: string;
  age_min?: number;
  age_max?: number;
  page?: number;
  limit?: number;
}) {
  try {
    const { getProducts } = await import('@/lib/db');
    return await getProducts(params);
  } catch (e) {
    console.error('Error fetching products:', e);
    return { products: [], total: 0 };
  }
}

async function safeGetCategories() {
  try {
    const { getCategories } = await import('@/lib/db');
    return await getCategories();
  } catch {
    return [];
  }
}

const PAGE_SIZE = 12;

function buildPageHref(params: {
  category?: string;
  search?: string;
  sort?: string;
  age?: string;
  page: number;
}) {
  const sp = new URLSearchParams();
  if (params.category) sp.set('category', params.category);
  if (params.search) sp.set('search', params.search);
  if (params.sort) sp.set('sort', params.sort);
  if (params.age) sp.set('age', params.age);
  sp.set('page', params.page.toString());
  return `/shop?${sp.toString()}`;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const sort = typeof params.sort === 'string' ? params.sort : undefined;
  const age = typeof params.age === 'string' ? params.age : undefined;
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;

  let ageMin: number | undefined;
  let ageMax: number | undefined;
  if (age) {
    const parts = age.split('-');
    ageMin = parseInt(parts[0]);
    ageMax = parts[1] ? parseInt(parts[1]) : ageMin;
  }

  const { products, total } = await safeGetProducts({
    category,
    search,
    sort,
    age_min: ageMin,
    age_max: ageMax,
    page,
    limit: PAGE_SIZE,
  });

  const categories = await safeGetCategories();
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const activeFilters = [
    category ? categories.find((c) => c.slug === category)?.name ?? category : null,
    age ? `Ages ${age.replace('-', '–')}` : null,
    search ? `"${search}"` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Page header */}
      <div className="mb-8 sm:mb-10">
        {search ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-orange mb-2">Search</p>
        ) : (
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-orange mb-2">Bookstore</p>
        )}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 font-display">
          {search ? `Results for "${search}"` : 'All Books'}
        </h1>
        <p className="text-gray-500 mt-2">
          {total} {total === 1 ? 'book' : 'books'}
          {activeFilters.length > 0 && <> · {activeFilters.join(' · ')}</>}
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <ShopFilters categories={categories} selectedCategory={category} selectedAge={age} selectedSort={sort} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="lg:hidden mb-6">
            <ShopFilters categories={categories} selectedCategory={category} selectedAge={age} selectedSort={sort} mobile />
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {products.map((product: Product) => (
                <BookCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-16 ring-1 ring-gray-100 shadow-none">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-brand-purple/10 flex items-center justify-center">
                <SearchX className="h-8 w-8 text-brand-purple" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No books found</h2>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Try adjusting your filters or search terms to discover more stories.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/shop" className="btn-primary">Clear Filters</Link>
                <Link href="/categories" className="btn-secondary">
                  <SlidersHorizontal className="h-4 w-4 mr-2" aria-hidden="true" />
                  Browse Categories
                </Link>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-12" aria-label="Pagination">
              {page > 1 && (
                <Link
                  href={buildPageHref({ category, search, sort, age, page: page - 1 })}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildPageHref({ category, search, sort, age, page: p })}
                  aria-current={p === page ? 'page' : undefined}
                  className={`min-w-[40px] px-4 py-2 rounded-xl text-sm font-medium text-center transition-colors ${
                    p === page
                      ? 'bg-brand-purple text-white shadow-sm'
                      : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </Link>
              ))}
              {page < totalPages && (
                <Link
                  href={buildPageHref({ category, search, sort, age, page: page + 1 })}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
