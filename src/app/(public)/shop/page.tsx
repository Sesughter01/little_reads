import Link from 'next/link';
import { Star, BookOpen, SearchX } from 'lucide-react';
import { ShopFilters } from '@/components/product/shop-filters';
import { formatPrice, getAgeRangeText } from '@/lib/utils';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import type { Product, Category } from '@/types';

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
  } catch (e) {
    return [];
  }
}

function BookCard({ product }: { product: Product }) {
  return (
    <div className="rounded-2xl bg-white p-0 shadow-sm transition-all hover:shadow-md overflow-hidden">
      <Link href={`/books/${product.slug}`} className="block">
        <div className="relative aspect-[2/3] bg-gray-100 overflow-hidden">
          {product.cover_url ? (
            <img src={product.cover_url} alt={product.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-orange-100">
              <BookOpen className="h-10 w-10 text-purple-300" />
            </div>
          )}
          {product.sale_price && <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Sale</span>}
          {product.featured && <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Featured</span>}
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {product.category && (
            <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">{product.category.name}</span>
          )}
          <span className="text-xs text-gray-500">{getAgeRangeText(product.age_min, product.age_max)}</span>
        </div>
        <Link href={`/books/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 mb-1 hover:text-purple-700 transition-colors line-clamp-2">{product.title}</h3>
        </Link>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.short_description}</p>
        {product.average_rating !== undefined && product.average_rating > 0 && (
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`h-4 w-4 ${s <= Math.round(product.average_rating!) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
            ))}
            <span className="text-sm text-gray-500 ml-1">({product.review_count || 0})</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">{formatPrice(product.sale_price || product.price)}</span>
          <AddToCartButton product={product} size="sm" />
        </div>
      </div>
    </div>
  );
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
    limit: 12,
  });

  const categories = await safeGetCategories();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {search ? `Search Results for "${search}"` : 'All Books'}
        </h1>
        <p className="text-gray-500 mt-2">
          {total} {total === 1 ? 'book' : 'books'} found
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden lg:block">
          <ShopFilters categories={categories} selectedCategory={category} selectedAge={age} selectedSort={sort} />
        </aside>

        <div>
          <div className="lg:hidden mb-6">
            <ShopFilters categories={categories} selectedCategory={category} selectedAge={age} selectedSort={sort} mobile />
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {products.map((product) => (
                <BookCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <SearchX className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No books found</h2>
              <p className="text-gray-500">Try adjusting your filters or search terms</p>
            </div>
          )}

          {total > 12 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              {Array.from({ length: Math.ceil(total / 12) }, (_, i) => i + 1).map((p) => {
                const sp = new URLSearchParams();
                if (category) sp.set('category', category);
                if (search) sp.set('search', search);
                if (sort) sp.set('sort', sort);
                if (age) sp.set('age', age);
                sp.set('page', p.toString());
                return (
                  <a key={p} href={`/shop?${sp.toString()}`} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${p === page ? 'bg-purple-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{p}</a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
