'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, MailOpen } from 'lucide-react';
import toast from 'react-hot-toast';

export function MessageActions({
  messageId,
  read,
}: {
  messageId: string;
  read: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const toggleRead = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: !read }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleRead}
      disabled={busy}
      className={`p-2 rounded-xl transition-colors ${
        read
          ? 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'
          : 'text-brand-purple hover:bg-purple-50'
      }`}
      title={read ? 'Mark as unread' : 'Mark as read'}
    >
      {read ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
    </button>
  );
}