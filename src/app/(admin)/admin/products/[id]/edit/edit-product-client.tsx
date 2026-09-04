'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Trash2, Upload, ImageIcon, FileText, X } from 'lucide-react';

export function EditProductClient({ productId }: { productId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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
        price: String(p.price || ''),
        sale_price: p.sale_price ? String(p.sale_price) : '',
        age_min: String(p.age_min || 5),
        age_max: String(p.age_max || 10),
        reading_level: p.reading_level || 'Beginner',
        page_count: String(p.page_count || 12),
        reading_time: p.reading_time || '8 min',
        category_id: p.category_id || '',
        featured: p.featured || false,
        published: p.published || false,
      });

      setCoverPreview(p.cover_url || null);
      setPdfPath(p.pdf_path || null);
      if (p.pdf_path) setPdfFileName(p.pdf_path.split('/').pop() || 'ebook.pdf');

      setCategories(catsRes.data || []);
      setIsLoading(false);
    };

    loadProduct();
  }, [productId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          slug:
            form.slug ||
            form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
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
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      toast.success('Product updated!');
      router.push('/admin/products');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      toast.success('Product deleted');
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        <div>
          <label className="label">Category</label>
          <select value={form.category_id} onChange={(e) => setForm({...form, category_id: e.target.value})} className="input">
            <option value="">No Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
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

      {/* Asset Management */}
      <div className="card max-w-2xl mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Assets</h2>

        {/* Cover Upload */}
        <div className="mb-6">
          <label className="label">Cover Image</label>
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
                  onClick={() => coverInputRef.current?.click()
                  }
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

        {/* PDF Upload */}
        <div>
          <label className="label">Ebook PDF</label>
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
                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">PDF only. Max 50MB.</p>
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
      </div>
    </div>
  );
}
