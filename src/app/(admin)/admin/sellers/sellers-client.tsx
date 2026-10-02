'use client';

import { useState, useEffect, useCallback } from 'react';
import { Ban, Check, Store, X } from 'lucide-react';
import toast from 'react-hot-toast';

type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

interface SellerRow {
  user_id: string;
  display_name: string;
  business_name: string | null;
  bio: string | null;
  status: SellerStatus;
  approved_at: string | null;
  created_at: string;
  profiles: { email: string | null; first_name: string | null; last_name: string | null } | null;
}

const STATUS_BADGE: Record<SellerStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-gray-200 text-gray-700',
};

const STATUS_LABEL: Record<SellerStatus, string> = {
  pending: 'Pending Review',
  approved: 'Active',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

const FILTERS: Array<{ value: 'all' | SellerStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

export function SellersClient() {
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [counts, setCounts] = useState<Record<SellerStatus, number>>({
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  });
  const [filter, setFilter] = useState<'all' | SellerStatus>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchData = useCallback(async (f: 'all' | SellerStatus) => {
    setIsLoading(true);
    const qs = f === 'all' ? '' : `?status=${f}`;
    const res = await fetch(`/api/admin/sellers${qs}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error || 'Failed to load seller applications');
      setSellers([]);
    } else {
      setSellers(data.sellers || []);
      if (data.counts) setCounts(data.counts);
    }
    setIsLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchData(filter);
  }, [filter, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const moderate = async (row: SellerRow, status: SellerStatus) => {
    if (
      (status === 'rejected' || status === 'suspended') &&
      !confirm(`${status === 'rejected' ? 'Reject' : 'Suspend'} "${row.display_name}"?`)
    ) {
      return;
    }
    setBusyId(row.user_id);
    const res = await fetch(`/api/admin/sellers/${row.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => null);
    setBusyId(null);
    if (!res.ok) {
      toast.error(data?.error || 'Failed to update seller');
      return;
    }
    toast.success(
      status === 'approved'
        ? 'Seller approved'
        : status === 'rejected'
          ? 'Application rejected'
          : status === 'suspended'
            ? 'Seller suspended'
            : 'Seller updated'
    );
  };

  const actionsFor = (row: SellerRow) => {
    switch (row.status) {
      case 'pending':
        return (
          <>
            <button
              onClick={() => moderate(row, 'approved')}
              disabled={busyId === row.user_id}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Check className="h-3.5 w-3.5" /> Approve
            </button>
            <button
              onClick={() => moderate(row, 'rejected')}
              disabled={busyId === row.user_id}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </>
        );
      case 'rejected':
        return (
          <button
            onClick={() => moderate(row, 'approved')}
            disabled={busyId === row.user_id}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </button>
        );
      case 'approved':
        return (
          <button
            onClick={() => moderate(row, 'suspended')}
            disabled={busyId === row.user_id}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Ban className="h-3.5 w-3.5" /> Suspend
          </button>
        );
      case 'suspended':
        return (
          <button
            onClick={() => moderate(row, 'approved')}
            disabled={busyId === row.user_id}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Check className="h-3.5 w-3.5" /> Reinstate
          </button>
        );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="h-6 w-6 text-brand-purple" /> Seller Applications
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Approve, reject, or suspend seller accounts. Approval is stamped with your admin ID.
          </p>
        </div>
        {counts.pending > 0 && (
          <span className="badge bg-amber-100 text-amber-800">
            {counts.pending} pending review
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const badge =
            f.value !== 'all' && counts[f.value as SellerStatus] > 0
              ? ` (${counts[f.value as SellerStatus]})`
              : '';
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-xl transition-colors ${
                active
                  ? 'bg-brand-purple text-white'
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {f.label}
              {badge}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading applications…</div>
      ) : sellers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No seller applications in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sellers.map((row) => (
            <div key={row.user_id} className="card p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">{row.display_name}</p>
                    <span className={`badge ${STATUS_BADGE[row.status]}`}>
                      {STATUS_LABEL[row.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {row.profiles?.first_name} {row.profiles?.last_name}
                    {row.profiles?.email ? ` · ${row.profiles.email}` : ''}
                  </p>
                  {row.business_name && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Business: {row.business_name}
                    </p>
                  )}
                  {row.bio && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{row.bio}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    Applied {new Date(row.created_at).toLocaleDateString()}
                    {row.approved_at &&
                      ` · Approved ${new Date(row.approved_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">{actionsFor(row)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
