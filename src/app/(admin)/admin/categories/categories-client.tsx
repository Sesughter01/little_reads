'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export function CategoriesClient() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });

  const fetchCategories = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories((data as CategoryData[]) || []);
    setIsLoading(false);
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchCategories();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    const supabase = createClient();
    const slug = form.slug || slugify(form.name);

    const { error } = await supabase.from('categories').insert({
      name: form.name.trim(),
      slug,
      description: form.description.trim() || null,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('A category with this name or slug already exists');
      } else {
        toast.error('Failed to create category');
      }
      return;
    }

    toast.success('Category created');
    setShowCreate(false);
    setForm({ name: '', slug: '', description: '' });
    fetchCategories();
  };

  const handleUpdate = async (id: string) => {
    if (!form.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('categories')
      .update({
        name: form.name.trim(),
        slug: form.slug || slugify(form.name),
        description: form.description.trim() || null,
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update category');
      return;
    }

    toast.success('Category updated');
    setEditingId(null);
    setForm({ name: '', slug: '', description: '' });
    fetchCategories();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Products in this category will not be deleted.`)) return;

    const supabase = createClient();
    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        toast.error('Cannot delete: this category is used by products');
      } else {
        toast.error('Failed to delete category');
      }
      return;
    }

    toast.success('Category deleted');
    fetchCategories();
  };

  const startEdit = (cat: CategoryData) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || '' });
    setShowCreate(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', slug: '', description: '' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        {!showCreate && !editingId && (
          <button
            onClick={() => { setShowCreate(true); setForm({ name: '', slug: '', description: '' }); }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card mb-6 max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">New Category</h2>
            <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Category name"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="input"
                placeholder="auto-generated from name"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input"
                placeholder="Short description (optional)"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleCreate} className="btn-primary">
                <Check className="h-4 w-4 mr-1" />
                Create
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-brand-purple border-t-transparent rounded-full mx-auto" />
          </div>
        ) : categories.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {categories.map((cat) => (
              <div key={cat.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                {editingId === cat.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Name</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="input text-sm"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Slug</label>
                        <input
                          type="text"
                          value={form.slug}
                          onChange={(e) => setForm({ ...form, slug: e.target.value })}
                          className="input text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label text-xs">Description</label>
                      <input
                        type="text"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="input text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(cat.id)} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-brand-purple rounded-lg hover:bg-brand-purple-dark transition-colors">
                        <Check className="h-3 w-3" /> Save
                      </button>
                      <button onClick={cancelEdit} className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{cat.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">/{cat.slug}</p>
                      {cat.description && (
                        <p className="text-sm text-gray-500 mt-1">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-2 text-gray-400 hover:text-brand-purple hover:bg-purple-50 rounded-xl transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No categories yet. Create your first category!</p>
          </div>
        )}
      </div>
    </div>
  );
}
