'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    author: 'LittleReads Editorial Team',
    short_description: '',
    description: '',
    price: '',
    sale_price: '',
    age_min: '5',
    age_max: '10',
    reading_level: 'Beginner',
    page_count: '12',
    reading_time: '8 min',
    category_id: '',
    featured: false,
    published: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from('products').insert({
        title: form.title,
        slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        author: form.author,
        short_description: form.short_description,
        description: form.description,
        price: parseInt(form.price) || 0,
        sale_price: form.sale_price ? parseInt(form.sale_price) : null,
        age_min: parseInt(form.age_min) || 5,
        age_max: parseInt(form.age_max) || 10,
        reading_level: form.reading_level,
        page_count: parseInt(form.page_count) || 12,
        reading_time: form.reading_time,
        category_id: form.category_id || null,
        featured: form.featured,
        published: form.published,
      });

      if (error) throw error;

      toast.success('Product created!');
      router.push('/admin/products');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-purple mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Create Product</h1>

      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        <div>
          <label className="label">Title *</label>
          <input type="text" required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Slug</label>
            <input type="text" value={form.slug} onChange={(e) => setForm({...form, slug: e.target.value})} className="input" placeholder="auto-generated" />
          </div>
          <div>
            <label className="label">Author</label>
            <input type="text" value={form.author} onChange={(e) => setForm({...form, author: e.target.value})} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Short Description *</label>
          <input type="text" required value={form.short_description} onChange={(e) => setForm({...form, short_description: e.target.value})} className="input" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea rows={4} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="input resize-none" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Price (₦) *</label>
            <input type="number" required min="0" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="input" />
          </div>
          <div>
            <label className="label">Sale Price (₦)</label>
            <input type="number" min="0" value={form.sale_price} onChange={(e) => setForm({...form, sale_price: e.target.value})} className="input" />
          </div>
          <div>
            <label className="label">Page Count</label>
            <input type="number" min="1" value={form.page_count} onChange={(e) => setForm({...form, page_count: e.target.value})} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Age Min</label>
            <input type="number" min="0" max="18" value={form.age_min} onChange={(e) => setForm({...form, age_min: e.target.value})} className="input" />
          </div>
          <div>
            <label className="label">Age Max</label>
            <input type="number" min="0" max="18" value={form.age_max} onChange={(e) => setForm({...form, age_max: e.target.value})} className="input" />
          </div>
          <div>
            <label className="label">Reading Level</label>
            <select value={form.reading_level} onChange={(e) => setForm({...form, reading_level: e.target.value})} className="input">
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Reading Time</label>
          <input type="text" value={form.reading_time} onChange={(e) => setForm({...form, reading_time: e.target.value})} className="input" />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({...form, featured: e.target.checked})} className="rounded" />
            <span className="text-sm">Featured</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({...form, published: e.target.checked})} className="rounded" />
            <span className="text-sm">Published</span>
          </label>
        </div>
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Creating...' : 'Create Product'}
          </button>
          <Link href="/admin/products" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
