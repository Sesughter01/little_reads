'use client';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import toast from 'react-hot-toast';

function initialsAvatar(first_name: string, last_name: string) {
  const f = (first_name || '')[0] || '';
  const l = (last_name || '')[0] || '';
  return (
    <div className="w-16 h-16 rounded-full bg-brand-purple/10 border-2 border-gray-200 flex items-center justify-center">
      <span className="text-lg font-semibold text-brand-purple">
        {f}{l}
      </span>
    </div>
  );
}

export function AvatarSection({ userId, profile }: { userId: string; profile: { avatar_url: string | null; first_name: string; last_name: string } }) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images are allowed.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large. Maximum 5 MB.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/account/profile/avatar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success && data.avatar_url) {
        // Show the new avatar immediately — keep the old one on failure.
        setAvatarUrl(data.avatar_url);
        toast.success('Profile photo updated.');
      } else {
        toast.error(data.error || 'Could not update photo.');
      }
    } catch {
      toast.error('Could not update photo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Make the camera control keyboard accessible (Enter / Space open the picker).
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
      <div className="relative inline-block">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${profile.first_name} ${profile.last_name}`}
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
          />
        ) : (
          initialsAvatar(profile.first_name, profile.last_name)
        )}
        {/* Camera/edit icon overlay — keyboard accessible */}
        <label
          htmlFor={`avatar-upload-${userId}`}
          role="button"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className={`absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border border-gray-200 flex items-center justify-center shadow cursor-pointer transition-colors
            ${uploading ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brand-purple'}
          `}
          title="Update profile photo"
          aria-label="Update profile photo"
        >
          <Camera className="h-4 w-4 text-gray-500" />
          <input
            id={`avatar-upload-${userId}`}
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleFileChange}
            disabled={uploading}
            aria-label="Upload profile photo"
          />
        </label>
      </div>
      <div className="text-sm text-gray-500">
        <p>
          <span className="font-medium text-gray-700">Click the camera icon</span> to
          update your profile photo.
        </p>
        <p className="mt-1">JPEG, PNG, or WebP — max 5 MB.</p>
      </div>
    </div>
  );
}