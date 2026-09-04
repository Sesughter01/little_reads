'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';

interface FormState {
  title: string;
  slug: string;
  author: string;
  short_description: string;
  description: string;
  price: string;
  sale_price: string;
  age_min: string;
  age_max: string;
  reading_level: string;
  page_count: string;
  reading_time: string;
  category_id: string;
  featured: boolean;
}

const emptyForm: FormState = {
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
};

/** Parse a numeric field; blank → null, garbage → null. Caller decides meaning. */
function toNumOrNull(value: string): number | null {
  const t = value.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function NewProductClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('categories').select('id, name').order('name').then(({ data }) => {
      setCategories(data || []);
    });
  }, []);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Client-side guards so we never send obviously-invalid data and rely on
    // the generic server message.
    const price = toNumOrNull(form.price);
    if (price === null) {
      toast.error('Regular price is required.');
      setIsLoading(false);
      return;
    }

    const saleRaw = toNumOrNull(form.sale_price);
    if (form.sale_price.trim() !== '' && saleRaw === null) {
      toast.error('Sale price must be a whole number.');
      setIsLoading(false);
      return;
    }
    if (saleRaw !== null && saleRaw >= price) {
      toast.error('Sale price must be lower than the regular price.');
      setIsLoading(false);
      return;
    }
    if (saleRaw !== null && saleRaw < 1) {
      toast.error('Sale price must be at least 1, or leave it blank for no sale.');
      setIsLoading(false);
      return;
    }

    const ageMin = toNumOrNull(form.age_min);
    const ageMax = toNumOrNull(form.age_max);
    if (ageMin === null || ageMax === null) {
      toast.error('Age range must be whole numbers.');
      setIsLoading(false);
      return;
    }
    if (ageMax < ageMin) {
      toast.error('Maximum age must be greater than or equal to minimum age.');
      setIsLoading(false);
      return;
    }

    const pageCount = toNumOrNull(form.page_count);

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          slug:
            form.slug ||
            form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          author: form.author,
          short_description: form.short_description,
          description: form.description,
          price,
          sale_price: saleRaw, // blank → null (never 0)
          age_min: ageMin,
          age_max: ageMax,
          reading_level: form.reading_level,
          page_count: pageCount ?? 0,
          reading_time: form.reading_time,
          category_id: form.category_id || null,
          featured: form.featured,
          published: false, // always starts as a draft; publish happens in Step 2
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Prefer the server's specific message (e.g. sale-price rule, duplicate slug)
        throw new Error(data.error || 'Failed to create product');
      }

      const productId: string | undefined = data?.product?.id;
      if (!productId) {
        throw new Error('Product was created but no product id was returned.');
      }

      toast.success('Book created — now add its cover and PDF.');
      // Step 2 (asset upload) needs the real product id, so continue to the
      // asset editor instead of dumping the owner back on the products list.
      router.push(`/admin/products/${productId}/edit?created=1#assets`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-purple mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-purple bg-brand-purple/10 px-2.5 py-1 rounded-full">
          <BookOpen className="h-3.5 w-3.5" />
          Step 1 of 2
        </span>
        <span className="text-xs text-gray-400">Book Details</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Add a New Book</h1>
      <p className="text-sm text-gray-500 mb-8">
        Enter the book details first. You&apos;ll upload the cover and ebook PDF
        right after, on the next step.
      </p>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Title *</label>
          <input type="text" required value={form.title} onChange={(e) => set({ title: e.target.value })} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Slug</label>
            <input type="text" value={form.slug} onChange={(e) => set({ slug: e.target.value })} className="input" placeholder="auto-generated" />
          </div>
          <div>
            <label className="label">Author</label>
            <input type="text" value={form.author} onChange={(e) => set({ author: e.target.value })} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Short Description *</label>
          <input type="text" required value={form.short_description} onChange={(e) => set({ short_description: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea rows={4} value={form.description} onChange={(e) => set({ description: e.target.value })} className="input resize-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Regular Price (₦) *</label>
            <input type="number" required min="0" value={form.price} onChange={(e) => set({ price: e.target.value })} className="input" placeholder="e.g. 2500" />
          </div>
          <div>
            <label className="label">Sale Price (₦)</label>
            <input type="number" min="0" value={form.sale_price} onChange={(e) => set({ sale_price: e.target.value })} className="input" placeholder="leave blank for none" />
          </div>
          <div>
            <label className="label">Page Count</label>
            <input type="number" min="1" value={form.page_count} onChange={(e) => set({ page_count: e.target.value })} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Age Min</label>
            <input type="number" min="0" max="18" value={form.age_min} onChange={(e) => set({ age_min: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Age Max</label>
            <input type="number" min="0" max="18" value={form.age_max} onChange={(e) => set({ age_max: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Reading Level</label>
            <select value={form.reading_level} onChange={(e) => set({ reading_level: e.target.value })} className="input">
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Reading Time</label>
          <input type="text" value={form.reading_time} onChange={(e) => set({ reading_time: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Category</label>
          <select value={form.category_id} onChange={(e) => set({ category_id: e.target.value })} className="input">
            <option value="">No Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} className="rounded" />
          <span className="text-sm">Featured</span>
        </label>
        <p className="text-xs text-gray-400 -mt-1">
          New books start as drafts — you&apos;ll publish after uploading the ebook PDF.
        </p>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Creating...' : (
              <>
                Create Book &amp; Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </button>
          <Link href="/admin/products" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
