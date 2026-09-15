'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/**
 * /seller/books/new — create a DRAFT book (metadata step 1).
 * Covers/PDFs attach later via the seller manage page / admin asset flow.
 * The seller can never publish: the API forces draft + published=false.
 */
export default function SellerNewBookPage() {
  const router = useRouter();
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [author, setAuthor] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [ageMin, setAgeMin] = useState('5');
  const [ageMax, setAgeMax] = useState('10');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Categories are public catalog data; read them with the anonymous
        // browser client (never the service role).
        const supabase = createClient();
        const { data } = await supabase.from('categories').select('id, name').order('name');
        if (alive && Array.isArray(data)) setCats(data as { id: string; name: string }[]);
      } catch {
        // categories optional
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const autoSlug = (t: string) =>
    t.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const p = price.trim() === '' ? undefined : Number(price);
    if (p === undefined || !Number.isInteger(p) || p < 0) {
      toast.error('Enter a valid whole-number price in Naira (0 or more).');
      return;
    }
    const saleRaw = salePrice.trim();
    const sp = saleRaw === '' ? null : Number(saleRaw);
    if (sp !== null && (!Number.isInteger(sp) || sp < 1)) {
      toast.error('Sale price must be at least ₦1, or left blank for no sale.');
      return;
    }
    setIsLoading(true);
    try {
      const finalSlug = slug.trim() || autoSlug(title);
      const res = await fetch('/api/seller/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: finalSlug,
          author: author.trim(),
          short_description: shortDesc.trim(),
          description,
          price: p,
          sale_price: sp,
          age_min: Number(ageMin),
          age_max: Number(ageMax),
          category_id: categoryId || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        book?: { id?: string };
        error?: string;
      } | null;
      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Please sign in first.');
          router.push('/login?redirect=/seller/books/new');
          return;
        }
        if (res.status === 403) {
          toast.error('Seller access required. Your application may still be under review.');
          router.push('/seller/pending');
          return;
        }
        toast.error(data?.error || 'Unable to create the book.');
        return;
      }
      toast.success('Draft created. Add the cover and ebook file next.');
      router.push(data?.book?.id ? `/seller/books/${data.book.id}` : '/seller/books');
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link href="/seller/books" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-purple">
        <ArrowLeft className="h-4 w-4" />
        Back to My Books
      </Link>
      <h1 className="text-xl font-bold text-gray-900">Add New Book</h1>
      <p className="mt-1 text-sm text-gray-500">
        Creates a draft. You can submit it for review afterwards — publishing is done by an admin.
      </p>

      <div className="card mt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="nb-title">Title</label>
            <input
              id="nb-title"
              className="input"
              required
              maxLength={200}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSlug((s) => s || autoSlug(e.target.value));
              }}
              placeholder="The Brave Little Explorer"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="nb-slug">URL slug</label>
              <input id="nb-slug" className="input" maxLength={200} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="the-brave-little-explorer" />
            </div>
            <div>
              <label className="label" htmlFor="nb-author">Author</label>
              <input id="nb-author" className="input" required maxLength={200} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="nb-short">Short description</label>
            <textarea id="nb-short" className="input resize-y" required rows={2} maxLength={500} value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="One or two sentences for listings." />
          </div>
          <div>
            <label className="label" htmlFor="nb-desc">Full description</label>
            <textarea id="nb-desc" className="input resize-y" rows={4} maxLength={10000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="The full story blurb shown on the book page." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="nb-price">Price</label>
              <input id="nb-price" className="input" required inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="5000" />
            </div>
            <div>
              <label className="label" htmlFor="nb-sale">Sale price (optional)</label>
              <input id="nb-sale" className="input" inputMode="numeric" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Blank = no sale" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="nb-agemin">Min age</label>
              <input id="nb-agemin" className="input" type="number" min={0} max={18} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="nb-agemax">Max age</label>
              <input id="nb-agemax" className="input" type="number" min={0} max={18} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="nb-cat">Category (optional)</label>
            <select id="nb-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">No category</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                Create Draft
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
