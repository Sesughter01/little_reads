'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

/** /seller/profile — edit safe display fields (never status/approval). */
export function SellerProfileForm({
  profile,
}: {
  profile: { display_name: string; business_name: string | null; bio: string | null };
}) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [businessName, setBusinessName] = useState(profile.business_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (displayName.trim().length < 2) {
      toast.error('Display name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/seller/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          business_name: businessName.trim(),
          bio: bio.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || 'Unable to save.');
        return;
      }
      toast.success('Seller profile updated.');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="card mx-auto w-full max-w-2xl space-y-4">
      <div>
        <label className="label" htmlFor="sp-display">Seller / display name</label>
        <input
          id="sp-display"
          className="input"
          required
          minLength={2}
          maxLength={80}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="sp-business">Business name (optional)</label>
        <input
          id="sp-business"
          className="input"
          maxLength={120}
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="sp-bio">About you (optional)</label>
        <textarea
          id="sp-bio"
          className="input resize-y"
          rows={4}
          maxLength={1000}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
      <p className="text-xs text-gray-400">
        Only display fields are editable here. Approval status can only be changed by an admin.
      </p>
    </form>
  );
}
