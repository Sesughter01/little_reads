import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';

export const productInputSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
  author: z.string().min(1).max(200),
  short_description: z.string().min(1).max(500),
  description: z.string().max(10000).optional().default(''),
  price: z.number().min(0).max(1000000),
  sale_price: z.number().min(0).max(1000000).nullable().optional(),
  age_min: z.number().int().min(0).max(18),
  age_max: z.number().int().min(0).max(18),
  reading_level: z.string().max(50).optional().default('Beginner'),
  page_count: z.number().int().min(1).max(10000).optional().default(12),
  reading_time: z.string().max(50).optional().default('8 min'),
  category_id: z.string().uuid().nullable().optional(),
  featured: z.boolean().optional().default(false),
  published: z.boolean().optional().default(false),
});

/**
 * POST /api/admin/products — create a product (server-validated, admin-only).
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => null);
    const parsed = productInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid product data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    if (input.age_max < input.age_min) {
      return NextResponse.json(
        { error: 'Maximum age must be greater than or equal to minimum age' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from('products')
      .insert({
        title: input.title,
        slug: input.slug,
        author: input.author,
        short_description: input.short_description,
        description: input.description,
        price: input.price,
        sale_price: input.sale_price ?? null,
        age_min: input.age_min,
        age_max: input.age_max,
        reading_level: input.reading_level,
        page_count: input.page_count,
        reading_time: input.reading_time,
        category_id: input.category_id ?? null,
        featured: input.featured,
        published: input.published,
      })
      .select('id, title, slug, published')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A book with this slug already exists' },
          { status: 409 }
        );
      }
      console.error('Error creating product:', error);
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: data });
  } catch (error) {
    if (error instanceof Error && error.message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}