import Link from 'next/link';
import type { Metadata } from 'next';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Browse Categories</h1>
        <p className="text-gray-500 text-lg">
          Explore our collection of children&apos;s ebooks by topic
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCategories.map((category: { id: string; name: string; slug: string; description: string | null }) => (
          <Link
            key={category.id}
            href={`/shop?category=${category.slug}`}
            className="card hover:border-purple-700 border-2 border-transparent transition-all group"
          >
            <h2 className="text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors mb-2">
              {category.name}
            </h2>
            {category.description && (
              <p className="text-gray-500">{category.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
