import Link from 'next/link';
import { ArrowRight, BookOpen, Download, Shield, Heart, Star, Search, ShoppingCart, CreditCard, Sprout, Leaf, TreePine } from 'lucide-react';
import { BookCard } from '@/components/product/book-card';
import { CategoryIcon } from '@/components/product/category-icon';
import { NewsletterForm } from '@/components/newsletter-form';
import type { Product, Category } from '@/types';

export const dynamic = 'force-dynamic';

async function safeGetProducts(params?: { featured?: boolean; sort?: string; limit?: number }) {
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
    console.error('Error fetching categories:', e);
    return [];
  }
}

const fallbackBooks: Product[] = [
  { id: '1', title: 'Zara and the Missing Moonbeam', slug: 'zara-and-the-missing-moonbeam', short_description: 'A brave girl embarks on a magical quest to find the missing moonbeam.', price: 1500, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '1', name: 'Adventure', slug: 'adventure', description: null, image_url: null, created_at: '' }, age_min: 5, age_max: 7, average_rating: 4.5, review_count: 2, featured: true, published: true, sale_price: null, reading_time: '8 min', page_count: 16, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '1', description: '', pdf_path: null },
  { id: '2', title: "Tobi's Amazing Robot", slug: 'tobis-amazing-robot', short_description: 'A young inventor builds a robot from recycled materials for the science fair.', price: 1800, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '2', name: 'Science', slug: 'science', description: null, image_url: null, created_at: '' }, age_min: 6, age_max: 8, average_rating: 5, review_count: 2, featured: true, published: true, sale_price: null, reading_time: '10 min', page_count: 18, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '2', description: '', pdf_path: null },
  { id: '3', title: 'Amara and the Talking Baobab', slug: 'amara-and-the-talking-baobab', short_description: 'A girl discovers an ancient tree with wisdom to share about nature and respect.', price: 1500, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '3', name: 'African Stories', slug: 'african-stories', description: null, image_url: null, created_at: '' }, age_min: 6, age_max: 8, average_rating: 5, review_count: 1, featured: true, published: true, sale_price: null, reading_time: '10 min', page_count: 18, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '3', description: '', pdf_path: null },
  { id: '4', title: "Ada's First Day of School", slug: 'adas-first-day-of-school', short_description: 'A nervous girl finds courage on her first day of school.', price: 1000, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '4', name: 'Life Skills', slug: 'life-skills', description: null, image_url: null, created_at: '' }, age_min: 5, age_max: 6, average_rating: 5, review_count: 1, featured: true, published: true, sale_price: null, reading_time: '6 min', page_count: 12, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '4', description: '', pdf_path: null },
  { id: '5', title: 'The Kindness Jar', slug: 'the-kindness-jar', short_description: 'A girl fills a jar with stones for every kind act she performs.', price: 1200, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '5', name: 'Friendship', slug: 'friendship', description: null, image_url: null, created_at: '' }, age_min: 5, age_max: 7, average_rating: 4, review_count: 1, featured: true, published: true, sale_price: null, reading_time: '7 min', page_count: 14, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '5', description: '', pdf_path: null },
  { id: '6', title: "Chidi's Trip to Space", slug: 'chidis-trip-to-space', short_description: 'A boy visits every planet in the solar system in a dream rocket.', price: 2000, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '6', name: 'Science', slug: 'science', description: null, image_url: null, created_at: '' }, age_min: 7, age_max: 10, average_rating: 5, review_count: 1, featured: true, published: true, sale_price: null, reading_time: '14 min', page_count: 22, reading_level: 'Intermediate', created_at: '', updated_at: '', category_id: '6', description: '', pdf_path: null },
  { id: '7', title: 'Goodnight, Little Explorer', slug: 'goodnight-little-explorer', short_description: 'A calming bedtime adventure through an imaginary world.', price: 1200, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '7', name: 'Bedtime', slug: 'bedtime-stories', description: null, image_url: null, created_at: '' }, age_min: 5, age_max: 7, average_rating: 4.5, review_count: 2, featured: true, published: true, sale_price: null, reading_time: '8 min', page_count: 12, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '7', description: '', pdf_path: null },
  { id: '8', title: 'The Little Lion Who Learned to Listen', slug: 'the-little-lion-who-learned-to-listen', short_description: 'A lion cub learns that listening is about caring for others.', price: 1200, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '4', name: 'Life Skills', slug: 'life-skills', description: null, image_url: null, created_at: '' }, age_min: 5, age_max: 7, average_rating: 0, review_count: 0, featured: false, published: true, sale_price: null, reading_time: '7 min', page_count: 14, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '4', description: '', pdf_path: null },
];

const fallbackCategories: Category[] = [
  { id: '1', name: 'Adventure', slug: 'adventure', description: 'Exciting journeys and quests', image_url: null, created_at: '' },
  { id: '2', name: 'Science', slug: 'science', description: 'Discover how the world works', image_url: null, created_at: '' },
  { id: '3', name: 'Education', slug: 'education', description: 'Learn new concepts through stories', image_url: null, created_at: '' },
  { id: '4', name: 'African Stories', slug: 'african-stories', description: 'Stories from Africa for African children', image_url: null, created_at: '' },
  { id: '5', name: 'Life Skills', slug: 'life-skills', description: 'Building character and confidence', image_url: null, created_at: '' },
  { id: '6', name: 'Nature', slug: 'nature', description: 'Explore the natural world', image_url: null, created_at: '' },
  { id: '7', name: 'Friendship', slug: 'friendship', description: 'Stories about friends and connection', image_url: null, created_at: '' },
  { id: '8', name: 'Bedtime Stories', slug: 'bedtime-stories', description: 'Calm stories for bedtime', image_url: null, created_at: '' },
];

/** Consistent section header: eyebrow + title + optional description, left or centered. */
function SectionHeading({
  eyebrow,
  title,
  description,
  center = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <div className={`mb-8 ${center ? 'text-center' : ''}`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-orange mb-2">{eyebrow}</p>
      )}
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">{title}</h2>
      {description && <p className={`text-gray-500 mt-2 ${center ? 'max-w-xl mx-auto' : ''}`}>{description}</p>}
    </div>
  );
}

export default async function HomePage() {
  const { products: featuredBooks } = await safeGetProducts({ featured: true, limit: 8 });
  const categories = await safeGetCategories();

  const displayFeatured = featuredBooks.length > 0 ? featuredBooks : fallbackBooks;
  const displayCategories = categories.length > 0 ? categories : fallbackCategories;

  const ageGroups = [
    { label: 'Ages 5–6', description: 'Simple stories with big pictures', Icon: Sprout, min: 5, max: 6 },
    { label: 'Ages 6–8', description: 'Growing readers, bigger adventures', Icon: Leaf, min: 6, max: 8 },
    { label: 'Ages 8–10', description: 'Chapter books and complex stories', Icon: TreePine, min: 8, max: 10 },
  ];

  const benefits = [
    { icon: Star, title: 'Age-Appropriate', desc: 'Every story reviewed for ages 5–10', bg: 'bg-brand-yellow/15', color: 'text-brand-yellow' },
    { icon: Download, title: 'Instant Access', desc: 'Download your PDFs immediately', bg: 'bg-brand-green/10', color: 'text-brand-green' },
    { icon: BookOpen, title: 'Educational', desc: 'Learning outcomes with every book', bg: 'bg-brand-blue/10', color: 'text-brand-blue' },
    { icon: Shield, title: 'Safe Content', desc: 'Curated and parent-approved', bg: 'bg-brand-purple/10', color: 'text-brand-purple' },
    { icon: Heart, title: 'Read Anywhere', desc: 'Phone, tablet, or computer', bg: 'bg-brand-orange/10', color: 'text-brand-orange' },
  ];

  const steps = [
    { step: '1', title: 'Find a Book', desc: 'Browse the collection by age or topic', icon: Search },
    { step: '2', title: 'Add to Cart', desc: 'Pick the stories your child will love', icon: ShoppingCart },
    { step: '3', title: 'Pay Securely', desc: 'Safe checkout with Paystack', icon: CreditCard },
    { step: '4', title: 'Download & Read', desc: 'Instant PDF access, keep forever', icon: BookOpen },
  ];

  return (
    <div>
      {/* 1. Hero — value proposition + primary CTA */}
      <section className="relative bg-gradient-to-br from-brand-purple-dark via-brand-purple to-indigo-700 text-white overflow-hidden">
        {/* Soft decorative blobs for depth, brand colors only */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-orange/20 blur-3xl" aria-hidden="true" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 relative z-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-brand-yellow mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 fill-brand-yellow" aria-hidden="true" />
              Big Adventures for Little Readers
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-5 font-display">
              Stories That Make Reading{' '}
              <span className="text-brand-yellow">an Adventure</span>
            </h1>
            <p className="text-lg text-white/85 mb-8 max-w-lg leading-relaxed">
              Fun, educational ebooks for children ages 5–10. Instant PDF download after purchase.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center rounded-xl bg-brand-orange px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/20 transition-all hover:bg-brand-orange-dark hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-purple"
              >
                Browse Books
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center justify-center rounded-xl border-2 border-white/30 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Explore Categories
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Categories */}
      <section className="py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <SectionHeading
              eyebrow="Browse by topic"
              title="Explore Categories"
              description="Find stories that match your child's interests."
            />
            <Link href="/categories" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline mb-1">
              All Categories <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {displayCategories.slice(0, 8).map((cat: Category) => (
              <Link
                key={cat.id}
                href={`/shop?category=${cat.slug}`}
                className="group card !p-5 text-center ring-1 ring-gray-100 shadow-none hover:shadow-md hover:ring-brand-purple/30 hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
              >
                <div className="w-11 h-11 mx-auto mb-3 rounded-xl bg-brand-purple/10 flex items-center justify-center transition-transform group-hover:scale-110">
                  <CategoryIcon slug={cat.slug} className="h-5 w-5 text-brand-purple" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm group-hover:text-brand-purple transition-colors">{cat.name}</h3>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center sm:hidden">
            <Link href="/categories" className="btn-secondary">All Categories</Link>
          </div>
        </div>
      </section>

      {/* 3. Age discovery */}
      <section className="py-14 sm:py-20 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The right book for every reader"
            title="Browse by Age"
            description="Every story is written for a specific reading stage."
            center
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ageGroups.map((group) => (
              <Link
                key={group.label}
                href={`/shop?age=${group.min}-${group.max}`}
                className="group card text-center ring-1 ring-gray-100 shadow-none hover:shadow-md hover:ring-brand-purple/30 hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-brand-purple/10 flex items-center justify-center transition-transform group-hover:scale-110">
                  <group.Icon className="h-6 w-6 text-brand-purple" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{group.label}</h3>
                <p className="text-sm text-gray-500">{group.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Featured books */}
      <section className="py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <SectionHeading
              eyebrow="Loved by little readers"
              title="Featured Books"
              description="Handpicked stories for young readers."
            />
            <Link href="/shop" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline mb-1">
              View All <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {displayFeatured.map((book: Product) => (
              <BookCard key={book.id} product={book} />
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link href="/shop" className="btn-primary">View All Books</Link>
          </div>
        </div>
      </section>

      {/* 5. Benefits */}
      <section className="py-14 sm:py-20 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Why parents trust us"
            title="Why Parents Love LittleReads"
            center
          />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            {benefits.map((item) => (
              <div key={item.title} className="text-center">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl ${item.bg} flex items-center justify-center`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="From browsing to bedtime story"
            title="How It Works"
            center
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="relative w-12 h-12 mx-auto mb-3">
                  <div className="w-12 h-12 rounded-full bg-brand-purple text-white flex items-center justify-center shadow-sm">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-orange text-white text-[10px] font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Newsletter */}
      <section className="relative py-14 sm:py-20 bg-gradient-to-r from-brand-purple-dark to-indigo-600 text-white overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 font-display">Join the LittleReads Family</h2>
          <p className="text-white/80 mb-6 text-sm sm:text-base">Get updates on new books and special offers.</p>
          <NewsletterForm className="max-w-md mx-auto" />
        </div>
      </section>
    </div>
  );
}
