'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import type { Category } from '@/types';

export function ShopFilters({
  categories,
  selectedCategory,
  selectedAge,
  selectedSort,
  mobile,
}: {
  categories: Category[];
  selectedCategory?: string;
  selectedAge?: string;
  selectedSort?: string;
  mobile?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const sortOptions = [
    { label: 'Featured', value: '' },
    { label: 'Newest', value: 'newest' },
    { label: 'Price: Low to High', value: 'price-asc' },
    { label: 'Price: High to Low', value: 'price-desc' },
    { label: 'Highest Rated', value: 'rating' },
  ];

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const all = {
      category: selectedCategory,
      age: selectedAge,
      sort: selectedSort,
      ...overrides,
    };
    for (const [key, value] of Object.entries(all)) {
      if (value) params.set(key, value);
    }
    return `${pathname}?${params.toString()}`;
  }

  if (mobile) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
        <select
          value={selectedSort || ''}
          onChange={(e) => {
            window.location.href = buildUrl({ sort: e.target.value || undefined });
          }}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {isOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 overflow-hidden" onClick={() => setIsOpen(false)}>
            <div
              className="absolute right-0 top-0 h-full w-80 bg-white p-6 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg">Filters</h3>
                <button onClick={() => setIsOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <FilterContent
                categories={categories}
                selectedCategory={selectedCategory}
                selectedAge={selectedAge}
                buildUrl={buildUrl}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FilterContent
        categories={categories}
        selectedCategory={selectedCategory}
        selectedAge={selectedAge}
        buildUrl={buildUrl}
      />
    </div>
  );
}

function FilterContent({
  categories,
  selectedCategory,
  selectedAge,
  buildUrl,
}: {
  categories: Category[];
  selectedCategory?: string;
  selectedAge?: string;
  buildUrl: (overrides: Record<string, string | undefined>) => string;
}) {
  const ageGroups = [
    { label: 'All Ages', value: '' },
    { label: 'Ages 5–6', value: '5-6' },
    { label: 'Ages 6–8', value: '6-8' },
    { label: 'Ages 8–10', value: '8-10' },
  ];

  return (
    <>
      {/* Categories */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
        <div className="space-y-1">
          <Link
            href={buildUrl({ category: undefined })}
            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
              !selectedCategory
                ? 'bg-brand-purple/10 text-brand-purple font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Categories
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={buildUrl({ category: cat.slug })}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === cat.slug
                  ? 'bg-brand-purple/10 text-brand-purple font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Age Groups */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Age Group</h3>
        <div className="space-y-1">
          {ageGroups.map((age) => (
            <Link
              key={age.value}
              href={buildUrl({ age: age.value || undefined })}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                (selectedAge || '') === age.value
                  ? 'bg-brand-purple/10 text-brand-purple font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {age.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
