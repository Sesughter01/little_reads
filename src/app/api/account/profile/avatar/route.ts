import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const AVATAR_BUCKET = 'avatars';

/**
 * POST /api/account/profile/avatar
 *
 * Upload or replace the authenticated user's own profile photo.
 *
 * Storage:
 *   bucket  avatars   (must exist in Supabase storage — create manually if
 *   not present)
 *   path    {userId}/{timestamp}.{ext}
 *
 * The bucket should be PUBLIC or use createSignedUrl depending on how you
 * want avatars served. This route stores the object and writes the public
 * URL back to profiles.avatar_url.
 *
 * Security:
 *   - requireUser() → only the authenticated profile can update
 *   - path scoped to userId — one user cannot overwrite another's avatar
 *   - MIME + size validated server-side
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, profile } = await requireUser();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Image too large. Maximum 5 MB.' },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();

    // Storage path scoped to this user — safe: uses the real userId.
    const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await serviceClient.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Avatar upload error:', {
        op: 'profile.avatar.upload',
        userId: userId.slice(0, 8),
        message: uploadError.message,
      });
      return NextResponse.json({ error: 'Avatar upload failed' }, { status: 500 });
    }

    // Public URL — adjust if your avatar bucket is private (use createSignedUrl).
    const { data: urlData } = serviceClient.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

    // Update the profile server-side (service role bypasses RLS).
    const { error: updateError } = await serviceClient
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('Avatar DB update error:', {
        op: 'profile.avatar.update',
        userId: userId.slice(0, 8),
        code: updateError.code,
      });
      return NextResponse.json({ error: 'Failed to save avatar' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      avatar_url: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Avatar API error:', { op: 'profile.avatar', error });
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
