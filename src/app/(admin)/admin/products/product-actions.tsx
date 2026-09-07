'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Eye, EyeOff, Archive, Trash2, Loader2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProductActions({
  productId,
  published,
  productPdfPath,
}: {
  productId: string;
  published: boolean;
  productPdfPath?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'publish' | 'delete' | null>(null);

  const togglePublish = async () => {
    setBusy('publish');
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      toast.success(published ? 'Book unpublished' : 'Book published');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setBusy(null);
    }
  };

  const deleteOrArchive = async () => {
    const ok = window.confirm(
      published
        ? 'Delete this book? If it has orders or purchases it will be archived (hidden from the store) instead.'
        : 'Delete this book? If it has orders or purchases it will be archived instead.'
    );
    if (!ok) return;

    setBusy('delete');
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      if (data.archived) {
        toast.success('Book archived (has order history)');
      } else {
        toast.success('Book deleted');
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={togglePublish}
        disabled={busy !== null}
        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl"
        title={published ? 'Unpublish' : 'Publish'}
      >
        {busy === 'publish' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : published ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
      <Link
        href={`/admin/products/${productId}/edit`}
        className="p-2 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded-xl"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      {productPdfPath && (
        <a
          href={`/api/admin/products/${productId}/download`}
          download
          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl"
          title="Download Ebook"
        >
          <FileText className="h-4 w-4" />
        </a>
      )}
      <button
        type="button"
        onClick={deleteOrArchive}
        disabled={busy !== null}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
        title="Delete / Archive"
      >
        {busy === 'delete' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}