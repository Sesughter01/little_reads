'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Send, Trash2 } from 'lucide-react';

/**
 * Client actions for the seller manage-book page: submit for review
 * (draft/rejected → submitted) and delete own drafts.
 */
export function SellerManageBook({
  book,
}: {
  book: {
    id: string;
    workflow_status: string;
    published: boolean;
    title: string;
    author: string;
    short_description: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'submit' | 'delete' | null>(null);
  const editable = ['draft', 'submitted', 'rejected'].includes(book.workflow_status);

  const submit = async () => {
    if (busy) return;
    setBusy('submit');
    try {
      const res = await fetch(`/api/seller/books/${book.id}/submit`, { method: 'POST' });
      const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || 'Unable to submit the book.');
        return;
      }
      toast.success(data?.message || 'Submitted for review.');
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (busy) return;
    if (!window.confirm(`Delete the draft "${book.title}"? This cannot be undone.`)) return;
    setBusy('delete');
    try {
      const res = await fetch(`/api/seller/books/${book.id}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || 'Unable to delete the book.');
        return;
      }
      toast.success('Draft deleted.');
      router.push('/seller/books');
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card mt-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900">Review & publishing</h2>
        <p className="mt-1 text-sm text-gray-500">
          {book.published
            ? 'This book is live in the store. Contact support for changes to a published book.'
            : book.workflow_status === 'submitted'
              ? 'Your book is awaiting admin review. You will be able to sell it once approved.'
              : book.workflow_status === 'rejected'
                ? 'This book needs changes before it can be approved. Edit the details, then resubmit.'
                : 'Submit your draft when the title, description, price and files are ready.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {!book.published && (book.workflow_status === 'draft' || book.workflow_status === 'rejected') && (
          <button onClick={submit} disabled={busy !== null} className="btn-primary">
            <Send className="mr-2 h-4 w-4" />
            {busy === 'submit' ? 'Submitting…' : 'Submit for Review'}
          </button>
        )}
        {book.workflow_status === 'draft' && (
          <button onClick={remove} disabled={busy !== null} className="btn-secondary text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            {busy === 'delete' ? 'Deleting…' : 'Delete Draft'}
          </button>
        )}
      </div>
      {!editable && !book.published && (
        <p className="text-xs text-gray-400">
          This book is locked while under review or archived.
        </p>
      )}
      <div className="border-t border-gray-100 pt-4 text-sm text-gray-500">
        <p>
          <span className="font-medium text-gray-700">Author:</span> {book.author}
        </p>
        <p className="mt-1">
          <span className="font-medium text-gray-700">Short description:</span> {book.short_description}
        </p>
        <p className="mt-3 text-xs text-amber-700">
          Full metadata editing (title, price, cover, PDF) lands with the seller edit page —
          for now, drafts are created via Add New Book and submitted here.
        </p>
      </div>
    </div>
  );
}
