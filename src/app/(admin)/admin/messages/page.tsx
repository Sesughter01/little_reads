import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
import { formatDate } from '@/lib/utils';
import { MessageActions } from './message-actions';

export default async function AdminMessagesPage() {
  await requireAdmin();
  const supabase = await createServiceClient();

  const { data: messages } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  const unreadCount = messages?.filter((m) => !m.read).length || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Messages{' '}
        {unreadCount > 0 && (
          <span className="text-sm font-normal text-orange-600 ml-2">
            ({unreadCount} unread)
          </span>
        )}
      </h1>

      <div className="space-y-4">
        {messages && messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`bg-white rounded-2xl p-6 shadow-sm border-l-4 ${
                message.read ? 'border-gray-200' : 'border-brand-purple'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="font-semibold text-gray-900">{message.name}</h2>
                    <span className="text-sm text-gray-500">{message.email}</span>
                    {!message.read && (
                      <span className="badge text-xs bg-purple-100 text-purple-700">New</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-700 mt-1">{message.subject}</p>
                  <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap">{message.message}</p>
                  <p className="text-xs text-gray-400 mt-3">{formatDate(message.created_at)}</p>
                </div>
                <MessageActions messageId={message.id} read={message.read} />
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl shadow-sm py-12 text-center">
            <p className="text-gray-500">No messages yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}