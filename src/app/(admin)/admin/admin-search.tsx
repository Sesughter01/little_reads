'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, BookOpen, ShoppingBag, Users } from 'lucide-react';

interface SearchResult {
  id: string;
  kind: 'book' | 'order' | 'customer';
  title?: string;
  author?: string;
  customer_name?: string;
  customer_email?: string;
  paystack_reference?: string;
  status?: string;
  total?: number;
  name?: string;
  email?: string;
  href: string;
}

export function AdminSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on route change or Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const items: SearchResult[] = [
        ...(data.books || []).map((b: any) => ({
          id: b.id, kind: 'book', title: b.title, author: b.author,
          href: b.href, status: b.published ? 'Published' : 'Draft',
        })),
        ...(data.orders || []).map((o: any) => ({
          id: o.id, kind: 'order', customer_name: o.customer_name,
          customer_email: o.customer_email, paystack_reference: o.paystack_reference,
          status: o.status, total: o.total, href: o.href,
        })),
        ...(data.customers || []).map((c: any) => ({
          id: c.id, kind: 'customer', name: c.name, email: c.email, href: c.href,
        })),
      ];
      setResults(items.slice(0, 20));
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  function openSearch() {
    setOpen(true);
    setQuery('');
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closeSearch() {
    setOpen(false);
    setResults([]);
  }

  function handleSelect(item: SearchResult) {
    router.push(item.href);
    setOpen(false);
    setResults([]);
  }

  const kindLabel = (kind: string) => {
    if (kind === 'book') return 'Book';
    if (kind === 'order') return 'Order';
    if (kind === 'customer') return 'Customer';
    return kind;
  };

  return (
    <>
      {/* Search trigger in admin topbar */}
      <button
        onClick={openSearch}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors w-48 lg:w-64"
        aria-label="Search admin"
        aria-expanded={open}
      >
        <Search className="h-4 w-4" />
        <span className="text-gray-400">Search...</span>
      </button>

      {/* Mobile search trigger */}
      <button
        onClick={openSearch}
        className="sm:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
        aria-label="Search admin"
        aria-expanded={open}
        aria-controls="admin-search-overlay"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Search overlay */}
      {open && (
        <div
          id="admin-search-overlay"
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-[8vh]"
          onClick={closeSearch}
          role="dialog"
          aria-modal="true"
          aria-label="Admin search"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center border-b border-gray-100 px-4">
              <Search className="h-5 w-5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search books, orders, customers..."
                className="w-full px-3 py-3 text-base outline-none bg-transparent"
                autoComplete="off"
                aria-label="Search query"
              />
              <button
                onClick={closeSearch}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results */}
            {loading && (
              <div className="p-8 text-center text-sm text-gray-400">
                Searching…
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">
                No results for &quot;<strong>{query}</strong>&quot;
              </div>
            )}

            {!loading && results.length > 0 && (
              <ul className="max-h-[60vh] overflow-y-auto py-2" role="listbox">
                {results.map((item, idx) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <button
                      onClick={() => handleSelect(item)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors text-sm
                        ${idx === activeIndex ? 'bg-brand-purple/5' : 'hover:bg-gray-50'}
                      `}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseLeave={() => setActiveIndex(-1)}
                    >
                      <span className={`shrink-0 px-2 py-0.5 text-[10px] font-medium rounded uppercase ${
                        item.kind === 'book' ? 'bg-purple-100 text-purple-700' :
                        item.kind === 'order' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {kindLabel(item.kind)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate font-medium ${
                          item.kind === 'book' && item.title ? 'text-gray-900' :
                          item.kind === 'order' && item.customer_name ? 'text-gray-900' :
                          item.kind === 'customer' && item.name ? 'text-gray-900' :
                          'text-gray-500'
                        }`}>
                          {item.kind === 'book' && item.title ? item.title :
                           item.kind === 'order' && item.customer_name ? item.customer_name :
                           item.kind === 'customer' && item.name ? item.name :
                           '—'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {item.kind === 'book' && item.author ? `by ${item.author}` :
                           item.kind === 'order' && item.paystack_reference ? `Ref: ${item.paystack_reference}` :
                           item.kind === 'customer' && item.email ? item.email :
                           item.status ? `Status: ${item.status}` :
                           '—'}
                          {item.kind === 'order' && item.total != null && (
                            <span className="ml-2 font-medium text-gray-600">
                              {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(item.total)}
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Empty state */}
            {!loading && query.length < 2 && (
              <div className="p-8 text-center text-sm text-gray-400">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
