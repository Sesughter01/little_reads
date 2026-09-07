'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Save,
  Trash2,
  Upload,
  ImageIcon,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Rocket,
} from 'lucide-react';

const PDF_REQUIRED_MESSAGE =
  'Upload the ebook PDF before publishing this book.';

/** Blank → null; garbage → null (never silently 0). */
function toNumOrNull(value: string): number | null {
  const t = value.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

interface ProductForm {
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
  published: boolean;
}

const defaultForm: ProductForm = {
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
};

type PayloadResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string };

function buildPayload(form: ProductForm): PayloadResult {
  const price = toNumOrNull(form.price);
  if (price === null) return { ok: false, error: 'Regular price is required.' };

  const salePrice = form.sale_price.trim() === '' ? null : toNumOrNull(form.sale_price);
  if (form.sale_price.trim() !== '' && salePrice === null) {
    return { ok: false, error: 'Sale price must be a whole number.' };
  }
  if (salePrice !== null) {
    if (price === 0) return { ok: false, error: 'A free book cannot have a sale price.' };
    if (salePrice < 1) {
      return { ok: false, error: 'Sale price must be at least 1, or leave it blank for no sale.' };
    }
    if (salePrice >= price) {
      return { ok: false, error: 'Sale price must be lower than the regular price.' };
    }
  }

  const ageMin = toNumOrNull(form.age_min);
  const ageMax = toNumOrNull(form.age_max);
  if (ageMin === null || ageMax === null) {
    return { ok: false, error: 'Age range must be whole numbers.' };
  }
  if (ageMax < ageMin) {
    return { ok: false, error: 'Maximum age must be greater than or equal to minimum age.' };
  }

  const pageCount = toNumOrNull(form.page_count);

  return { ok: true, payload: {
    title: form.title,
    slug:
      form.slug ||
      form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    author: form.author,
    short_description: form.short_description,
    description: form.description,
    price,
    sale_price: salePrice, // blank → null
    age_min: ageMin,
    age_max: ageMax,
    reading_level: form.reading_level,
    page_count: pageCount ?? 0,
    reading_time: form.reading_time,
    category_id: form.category_id || null,
    featured: form.featured,
    published: form.published,
  } };
}

export function EditProductClient({
  productId,
  created,
}: {
  productId: string;
  created: boolean;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const assetSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProduct = async () => {
      const supabase = createClient();

      const [productRes, catsRes] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).single(),
        supabase.from('categories').select('id, name').order('name'),
      ]);

      if (productRes.error || !productRes.data) {
        toast.error('Product not found');
        router.push('/admin/products');
        return;
      }

      const p = productRes.data;
      setForm({
        title: p.title || '',
        slug: p.slug || '',
        author: p.author || 'LittleReads Editorial Team',
        short_description: p.short_description || '',
        description: p.description || '',
        price: p.price == null ? '' : String(p.price),
        sale_price: p.sale_price == null ? '' : String(p.sale_price),
        age_min: p.age_min == null ? '5' : String(p.age_min),
        age_max: p.age_max == null ? '10' : String(p.age_max),
        reading_level: p.reading_level || 'Beginner',
        page_count: p.page_count == null ? '0' : String(p.page_count),
        reading_time: p.reading_time || '8 min',
        category_id: p.category_id || '',
        featured: !!p.featured,
        published: !!p.published,
      });

      setCoverPreview(p.cover_url || null);
      setPdfPath(p.pdf_path || null);
      if (p.pdf_path) setPdfFileName(p.pdf_path.split('/').pop() || 'ebook.pdf');

      setCategories(catsRes.data || []);
      setIsLoading(false);
    };

    loadProduct();
  }, [productId, router]);

  // When the owner just created the book (Step 1 → Step 2), bring the asset
  // section into view so upload controls are impossible to miss.
  useEffect(() => {
    if (!isLoading && created) {
      const t = window.setTimeout(() => {
        assetSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => window.clearTimeout(t);
    }
  }, [isLoading, created]);

  const submitUpdate = async (payload: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update product');
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const result = buildPayload(form);
      if (!result.ok) {
        toast.error(result.error);
        setIsSaving(false);
        return;
      }
      const payload = result.payload;

      if (payload.published && !pdfPath) {
        toast.error(PDF_REQUIRED_MESSAGE);
        setIsSaving(false);
        return;
      }

      await submitUpdate(payload);
      toast.success(payload.published ? 'Book published!' : 'Book saved as draft.');
      router.push('/admin/products');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  /** Save as Draft (never requires a PDF). */
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const result = buildPayload(form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await submitUpdate({ ...result.payload, published: false });
      toast.success('Saved as draft. You can return and finish later.');
      router.push('/admin/products');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  /** Publish book (requires uploaded PDF). */
  const handlePublish = async () => {
    if (!pdfPath) {
      toast.error(PDF_REQUIRED_MESSAGE);
      return;
    }
    setIsSaving(true);
    try {
      const result = buildPayload(form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await submitUpdate({ ...result.payload, published: true });
      toast.success('Book published! It is now live in the store.');
      router.push('/admin/products');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish book');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this book? If it has orders or purchases it will be archived (hidden from the store) instead.')) {
      return;
    }

    try {
      // Deleting must go through the guarded server API, which archives books
      // that have order/purchase history instead of hard-deleting them.
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete product');
      if (data.archived) {
        toast.success('Book archived — it has purchase/order history, so it was hidden instead of deleted.');
      } else {
        toast.success('Book deleted');
      }
      router.push('/admin/products');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete product');
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('type', 'cover');
      formData.append('file', file);

      const response = await fetch(`/api/admin/products/${productId}/assets`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setCoverPreview(data.cover_url);
      toast.success('Cover uploaded!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload cover');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('type', 'pdf');
      formData.append('file', file);

      const response = await fetch(`/api/admin/products/${productId}/assets`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setPdfPath(data.pdf_path);
      setPdfFileName(file.name);
      toast.success('PDF uploaded!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload PDF');
    } finally {
      setIsUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleRemoveCover = async () => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/assets?type=cover`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove cover');
      setCoverPreview(null);
      toast.success('Cover removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove cover');
    }
  };

  const handleRemovePdf = async () => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/assets?type=pdf`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove PDF');
      setPdfPath(null);
      setPdfFileName(null);
      toast.success('PDF removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="card max-w-2xl space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-purple mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      {/* Step 2 success banner (only shown right after creating the book) */}
      {created && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                  Step 2 of 2
                </span>
                <h2 className="text-lg font-bold text-gray-900">Book created successfully</h2>
              </div>
              <p className="text-sm text-green-800">
                Now add the cover image and ebook PDF below, then publish the book
                when it&apos;s ready.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {created ? 'Upload Book Files' : 'Edit Product'}
        </h1>
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2 items-start">
        {/* Left: details */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Book Details</h2>
          <div>
            <label className="label">Title *</label>
            <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Slug</label>
              <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input" placeholder="auto-generated" />
            </div>
            <div>
              <label className="label">Author</label>
              <input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Short Description *</label>
            <input type="text" required value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Regular Price (₦) *</label>
              <input type="number" required min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Sale Price (₦)</label>
              <input type="number" min="0" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className="input" placeholder="blank = no sale" />
            </div>
            <div>
              <label className="label">Page Count</label>
              <input type="number" min="1" value={form.page_count} onChange={(e) => setForm({ ...form, page_count: e.target.value })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Age Min</label>
              <input type="number" min="0" max="18" value={form.age_min} onChange={(e) => setForm({ ...form, age_min: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Age Max</label>
              <input type="number" min="0" max="18" value={form.age_max} onChange={(e) => setForm({ ...form, age_max: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Reading Level</label>
              <select value={form.reading_level} onChange={(e) => setForm({ ...form, reading_level: e.target.value })} className="input">
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Reading Time</label>
            <input type="text" value={form.reading_time} onChange={(e) => setForm({ ...form, reading_time: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Category</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input">
              <option value="">No Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="rounded" />
              <span className="text-sm">Featured</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="rounded" />
              <span className="text-sm">Published</span>
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? 'Saving...' : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
            <Link href="/admin/products" className="btn-secondary">Cancel</Link>
          </div>
        </form>

        {/* Right: assets (Step 2) */}
        <div ref={assetSectionRef} id="assets" className="card space-y-6 scroll-mt-24">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Book Files</h2>
            <span className="text-xs font-medium text-brand-purple bg-brand-purple/10 px-2.5 py-1 rounded-full">
              {created ? 'Step 2 of 2' : 'Assets'}
            </span>
          </div>

          {/* Cover */}
          <div className="rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="label !mb-0">Cover Image</label>
              {coverPreview ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> UPLOADED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  <AlertCircle className="h-3 w-3" /> MISSING
                </span>
              )}
            </div>
            <div className="flex items-start gap-4">
              <div className="w-24 h-36 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingCover}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-purple bg-brand-purple/10 hover:bg-brand-purple/20 rounded-xl transition-colors"
                  >
                    {isUploadingCover ? (
                      <span className="animate-spin h-4 w-4 border-2 border-brand-purple border-t-transparent rounded-full" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {coverPreview ? 'Replace Cover' : 'Upload Cover'}
                  </button>
                  {coverPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">PNG, JPEG, WebP, or SVG. Max 10MB.</p>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* PDF */}
          <div className="rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="label !mb-0">Ebook PDF</label>
              {pdfPath ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> UPLOADED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  <AlertCircle className="h-3 w-3" /> MISSING
                </span>
              )}
            </div>
            <div className="flex items-start gap-4">
              <div className="w-24 h-36 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                {pdfPath ? (
                  <FileText className="h-10 w-10 text-red-400" />
                ) : (
                  <FileText className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                {pdfFileName && (
                  <p className="text-sm text-gray-700 mb-2 truncate">
                    Current: <span className="font-medium">{pdfFileName}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={isUploadingPdf}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-purple bg-brand-purple/10 hover:bg-brand-purple/20 rounded-xl transition-colors"
                  >
                    {isUploadingPdf ? (
                      <span className="animate-spin h-4 w-4 border-2 border-brand-purple border-t-transparent rounded-full" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {pdfPath ? 'Replace PDF' : 'Upload PDF'}
                  </button>
                  {pdfPath && (
                    <>
                      <a
                        href={`/api/admin/products/${productId}/download`}
                        download
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-green bg-brand-green/10 hover:bg-brand-green/20 rounded-xl transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        Download Ebook
                      </a>
                      <button
                        type="button"
                        onClick={handleRemovePdf}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">PDF only. Max 50MB. Stored privately.</p>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {!pdfPath && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              You can keep this as a draft without a PDF, but publishing requires the ebook file.
            </p>
          )}

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={handlePublish}
              disabled={isSaving}
              className="btn-primary"
            >
              {isSaving ? 'Saving...' : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Publish Book
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="btn-secondary"
            >
              Save as Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
