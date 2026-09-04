import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
  description: z.string().max(500).optional().nullable().default(null),
});

/**
 * POST /api/admin/categories — create a category (admin-only, server-validated).
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => null);
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid category data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
      })
      .select('id, name, slug')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A category with this name or slug already exists' },
          { status: 409 }
        );
      }
      console.error('Error creating category:', error);
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }

    return NextResponse.json({ success: true, category: data });
  } catch (error) {
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}