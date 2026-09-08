import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CategoryIcon } from '@/components/product/category-icon';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse children\'s ebooks by category',
};

const fallbackCategories = [
  { id: '1', name: 'Adventure', slug: 'adventure', description: 'Exciting journeys and quests' },
  { id: '2', name: 'Science', slug: 'science', description: 'Discover how the world works' },
  { id: '3', name: 'Education', slug: 'education', description: 'Learn new concepts through stories' },
  { id: '4', name: 'African Stories', slug: 'african-stories', description: 'Stories from Africa for African children' },
  { id: '5', name: 'Life Skills', slug: 'life-skills', description: 'Building character and confidence' },
  { id: '6', name: 'Nature', slug: 'nature', description: 'Explore the natural world' },
  { id: '7', name: 'Friendship', slug: 'friendship', description: 'Stories about friends and connection' },
  { id: '8', name: 'Bedtime Stories', slug: 'bedtime-stories', description: 'Calm stories for bedtime' },
];

async function safeGetCategories() {
  try {
    const { getCategories } = await import('@/lib/db');
    return await getCategories();
  } catch (e) {
    console.error('Error fetching categories:', e);
    return [];
  }
}

export default async function CategoriesPage() {
  const categories = await safeGetCategories();
  const displayCategories = categories.length > 0 ? categories : fallbackCategories;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="text-center mb-10 sm:mb-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-orange mb-2">Browse by topic</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 font-display">Browse Categories</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Explore our collection of children&apos;s ebooks by topic
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {displayCategories.map((category: { id: string; name: string; slug: string; description: string | null }) => (
          <Link
            key={category.id}
            href={`/shop?category=${category.slug}`}
            className="group card ring-1 ring-gray-100 shadow-none hover:shadow-md hover:ring-brand-purple/30 hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-brand-purple/10 flex items-center justify-center transition-transform group-hover:scale-110">
                <CategoryIcon slug={category.slug} className="h-6 w-6 text-brand-purple" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-brand-purple transition-colors mb-1">
                  {category.name}
                </h2>
                {category.description && (
                  <p className="text-sm text-gray-500 leading-relaxed">{category.description}</p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all ml-auto shrink-0 mt-1" aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
