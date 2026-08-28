import Link from 'next/link';
import { ArrowRight, BookOpen, Download, Shield, Heart, Star, CheckCircle, Search, ShoppingCart, CreditCard, Sprout, Leaf, TreePine } from 'lucide-react';
import { BookCard } from '@/components/product/book-card';
import { NewsletterForm } from '@/components/newsletter-form';
import type { Product, Category } from '@/types';

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
  { id: '1', title: 'Zara and the Missing Moonbeam', slug: 'zara-and-the-missing-moonbeam', short_description: 'A brave girl embarks on a magical quest.', price: 1500, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '1', name: 'Adventure', slug: 'adventure', description: null, image_url: null, created_at: '' }, age_min: 5, age_max: 7, average_rating: 4.5, review_count: 2, featured: true, published: true, sale_price: null, reading_time: '8 min', page_count: 16, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '1', description: '', pdf_path: null },
  { id: '2', title: "Tobi's Amazing Robot", slug: 'tobis-amazing-robot', short_description: 'A young inventor builds a robot from recycled materials.', price: 1800, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '2', name: 'Science', slug: 'science', description: null, image_url: null, created_at: '' }, age_min: 6, age_max: 8, average_rating: 5, review_count: 2, featured: true, published: true, sale_price: null, reading_time: '10 min', page_count: 18, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '2', description: '', pdf_path: null },
  { id: '3', title: 'Amara and the Talking Baobab', slug: 'amara-and-the-talking-baobab', short_description: 'A girl discovers an ancient tree with wisdom.', price: 1500, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '3', name: 'African Stories', slug: 'african-stories', description: null, image_url: null, created_at: '' }, age_min: 6, age_max: 8, average_rating: 5, review_count: 1, featured: true, published: true, sale_price: null, reading_time: '10 min', page_count: 18, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '3', description: '', pdf_path: null },
  { id: '4', title: "Ada's First Day of School", slug: 'adas-first-day-of-school', short_description: 'A nervous girl finds courage on her first day.', price: 1000, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '4', name: 'Life Skills', slug: 'life-skills', description: null, image_url: null, created_at: '' }, age_min: 5, age_max: 6, average_rating: 5, review_count: 1, featured: true, published: true, sale_price: null, reading_time: '6 min', page_count: 12, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '4', description: '', pdf_path: null },
  { id: '5', title: 'The Kindness Jar', slug: 'the-kindness-jar', short_description: 'A girl fills a jar with stones for every kind act.', price: 1200, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '5', name: 'Friendship', slug: 'friendship', description: null, image_url: null, created_at: '' }, age_min: 5, age_max: 7, average_rating: 4, review_count: 1, featured: true, published: true, sale_price: null, reading_time: '7 min', page_count: 14, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '5', description: '', pdf_path: null },
  { id: '6', title: "Chidi's Trip to Space", slug: 'chidis-trip-to-space', short_description: 'A boy visits every planet in the solar system.', price: 2000, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '6', name: 'Science', slug: 'science', description: null, image_url: null, created_at: '' }, age_min: 7, age_max: 10, average_rating: 5, review_count: 1, featured: true, published: true, sale_price: null, reading_time: '14 min', page_count: 22, reading_level: 'Intermediate', created_at: '', updated_at: '', category_id: '6', description: '', pdf_path: null },
  { id: '7', title: 'Goodnight, Little Explorer', slug: 'goodnight-little-explorer', short_description: 'A calming bedtime adventure through an imaginary world.', price: 1200, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '7', name: 'Bedtime', slug: 'bedtime-stories', description: null, image_url: null, created_at: '' }, age_min: 5, age_max: 7, average_rating: 4.5, review_count: 2, featured: true, published: true, sale_price: null, reading_time: '8 min', page_count: 12, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '7', description: '', pdf_path: null },
  { id: '8', title: 'The Little Lion Who Learned to Listen', slug: 'the-little-lion-who-learned-to-listen', short_description: 'A lion cub learns that listening is about caring.', price: 1200, cover_url: null, author: 'LittleReads Editorial Team', category: { id: '4', name: 'Life Skills', slug: 'life-skills', description: null, image_url: null, created_at: '' }, age_min: 5, age_max: 7, average_rating: 0, review_count: 0, featured: false, published: true, sale_price: null, reading_time: '7 min', page_count: 14, reading_level: 'Beginner', created_at: '', updated_at: '', category_id: '4', description: '', pdf_path: null },
];

const fallbackCategories: Category[] = [
  { id: '1', name: 'Adventure', slug: 'adventure', description: 'Exciting journeys and quests', image_url: null, created_at: '' },
  { id: '2', name: 'Science', slug: 'science', description: 'Discover how the world works', image_url: null, created_at: '' },
  { id: '3', name: 'Education', slug: 'education', description: 'Learn through stories', image_url: null, created_at: '' },
  { id: '4', name: 'African Stories', slug: 'african-stories', description: 'Stories from Africa', image_url: null, created_at: '' },
  { id: '5', name: 'Life Skills', slug: 'life-skills', description: 'Building character', image_url: null, created_at: '' },
  { id: '6', name: 'Nature', slug: 'nature', description: 'Explore the natural world', image_url: null, created_at: '' },
  { id: '7', name: 'Friendship', slug: 'friendship', description: 'Stories about friends', image_url: null, created_at: '' },
  { id: '8', name: 'Bedtime Stories', slug: 'bedtime-stories', description: 'Calm stories for bedtime', image_url: null, created_at: '' },
];

export default async function HomePage() {
  const { products: featuredBooks } = await safeGetProducts({ featured: true, limit: 8 });
  const { products: bestSellers } = await safeGetProducts({ sort: 'rating', limit: 4 });
  const categories = await safeGetCategories();

  const displayFeatured = featuredBooks.length > 0 ? featuredBooks : fallbackBooks;
  const displayBestSellers = bestSellers.length > 0 ? bestSellers : fallbackBooks.slice(0, 4);
  const displayCategories = categories.length > 0 ? categories : fallbackCategories;

  const ageGroups = [
    { label: 'Ages 5–6', description: 'Simple stories with big pictures', Icon: Sprout, min: 5, max: 6 },
    { label: 'Ages 6–8', description: 'Growing readers, bigger adventures', Icon: Leaf, min: 6, max: 8 },
    { label: 'Ages 8–10', description: 'Chapter books and complex stories', Icon: TreePine, min: 8, max: 10 },
  ];

  return (
    <div>
      {/* Hero - Compact, focused */}
      <section className="relative bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 relative z-10">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-orange-300 mb-2">Big Adventures for Little Readers</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              Stories That Make Reading{' '}
              <span className="text-orange-400">an Adventure</span>
            </h1>
            <p className="text-base lg:text-lg text-white/80 mb-6 max-w-lg">
              Fun, educational ebooks for children ages 5–10. Instant PDF download after purchase.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/shop" className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-orange-600">
                Browse Books
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/categories" className="inline-flex items-center justify-center rounded-xl border-2 border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-all">
                Categories
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Books */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Featured Books</h2>
              <p className="text-gray-500 mt-1 text-sm">Handpicked stories for young readers</p>
            </div>
            <Link href="/shop" className="hidden sm:flex items-center gap-1 text-sm text-purple-700 font-semibold hover:underline">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {displayFeatured.map((book: Product) => (
              <BookCard key={book.id} product={book} />
            ))}
          </div>
          <div className="mt-6 text-center sm:hidden">
            <Link href="/shop" className="btn-primary">View All Books</Link>
          </div>
        </div>
      </section>

      {/* Browse by Age */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-8 text-center">Browse by Age</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ageGroups.map((group) => (
              <Link key={group.label} href={`/shop?age=${group.min}-${group.max}`} className="card text-center hover:border-purple-700 border-2 border-transparent transition-all group">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform"><group.Icon className="h-6 w-6 text-brand-purple" /></div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{group.label}</h3>
                <p className="text-sm text-gray-500">{group.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-8 text-center">Browse Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {displayCategories.slice(0, 8).map((cat: Category) => (
              <Link key={cat.id} href={`/shop?category=${cat.slug}`} className="card text-center hover:border-purple-700 border-2 border-transparent transition-all py-4">
                <h3 className="font-semibold text-gray-900 text-sm group-hover:text-purple-700">{cat.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Parents Love LittleReads */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-8 text-center">Why Parents Love LittleReads</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { icon: <Star className="h-6 w-6 text-yellow-500" />, title: 'Age-Appropriate', desc: 'Reviewed for ages 5–10' },
              { icon: <Download className="h-6 w-6 text-green-500" />, title: 'Instant Access', desc: 'Download PDFs immediately' },
              { icon: <BookOpen className="h-6 w-6 text-blue-500" />, title: 'Educational', desc: 'Learning outcomes included' },
              { icon: <Shield className="h-6 w-6 text-purple-700" />, title: 'Safe Content', desc: 'Curated for children' },
              { icon: <Heart className="h-6 w-6 text-red-500" />, title: 'Read Anywhere', desc: 'Phone, tablet, or computer' },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-50 flex items-center justify-center">{item.icon}</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Find a Book', desc: 'Browse our collection', icon: Search },
              { step: '2', title: 'Add to Cart', desc: 'Select books you love', icon: ShoppingCart },
              { step: '3', title: 'Pay Securely', desc: 'Checkout with Paystack', icon: CreditCard },
              { step: '4', title: 'Download & Read', desc: 'Get instant PDF access', icon: BookOpen },
            ].map((item) => (                <div key={item.step} className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-700 text-white flex items-center justify-center"><item.icon className="h-5 w-5" /></div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-8 text-center">Parent Testimonials</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Adaeze O.', role: 'Parent of 2', text: "My daughter loves the Zara series! She asks to read it every night." },
              { name: 'Tunde A.', role: 'Father', text: "Quality Nigerian children's books that are digital and easy to access." },
              { name: 'Funke M.', role: 'Teacher', text: "I use these ebooks in my classroom. The children love them." },
            ].map((t) => (
              <div key={t.name} className="card">
                <div className="flex items-center gap-0.5 mb-3">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
                <p className="text-gray-600 mb-3 text-sm italic">&ldquo;{t.text}&rdquo;</p>
                <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                <p className="text-xs text-gray-500">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-purple-700 to-indigo-600 text-white">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Join the LittleReads Family</h2>
          <p className="text-white/80 mb-6 text-sm">Get updates on new books and special offers.</p>
          <NewsletterForm className="max-w-md mx-auto" />
        </div>
      </section>
    </div>
  );
}
