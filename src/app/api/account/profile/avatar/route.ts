import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireUserApi } from '@/lib/auth';

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
 *   not present; verified live: only ebook-covers / ebook-files exist)
 *   path    {userId}/{timestamp}.{ext}
 *
 * The bucket should be PUBLIC (stable public URL stored in profiles.avatar_url)
 * or use createSignedUrl if kept private.
 *
 * Security:
 *   - requireUserApi() → API-safe guard; NEVER redirects from a route handler.
 *     401 JSON for anonymous callers (the page-level requireUser() throws
 *     NEXT_REDIRECT inside API routes, which catch blocks turn into 500s).
 *   - Authenticated user ID always comes from the Supabase server session —
 *     never from the request body or a client-supplied userId.
 *   - Storage path is scoped to the session userId — one customer can never
 *     overwrite another customer's avatar.
 *   - MIME + size validated server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId;

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

    // Storage path scoped to this user — safe: uses the real session userId.
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
      const missingBucket =
        Number(uploadError.statusCode) === 404 ||
        /not found|does not exist/i.test(uploadError.message || '');
      console.error('Avatar upload error:', {
        op: 'profile.avatar.upload',
        userId: userId.slice(0, 8),
        code: missingBucket ? 'BUCKET_NOT_FOUND' : uploadError.statusCode ?? 'STORAGE_ERROR',
      });
      return NextResponse.json(
        {
          error: missingBucket
            ? 'Avatar storage is not configured yet. Create the "avatars" bucket in Supabase Storage (public, images only) and try again.'
            : 'Avatar upload failed',
        },
        { status: 500 }
      );
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