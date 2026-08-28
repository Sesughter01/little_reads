'use client';

import Link from 'next/link';
import { Star, BookOpen } from 'lucide-react';
import { formatPrice, getAgeRangeText } from '@/lib/utils';
import type { Product } from '@/types';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';

export function BookCard({ product }: { product: Product }) {
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
