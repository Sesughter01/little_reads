import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  checkRateLimit,
  tooManyRequestsResponse,
} from '@/lib/api-rate-limit';
import { z } from 'zod';

const reviewSchema = z.object({
  product_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(10).max(2000),
});

export async function POST(request: NextRequest) {
  try {
    // Malformed JSON is a client error (400), not a server fault (500).
    const body = await request.json().catch(() => null);
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { product_id, rating, title, content } = parsed.data;

    // Use cookie-based client for auth
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Throttle review submissions per account (spam/moderation-load guard).
    const limit = checkRateLimit(`reviews:${user.id}`, 5, 10 * 60_000);
    if (!limit.allowed) {
      return tooManyRequestsResponse(limit);
    }

    // Verify product exists and is published
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, published')
      .eq('id', product_id)
      .eq('published', true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check for existing review from this user
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this book' },
        { status: 409 }
      );
    }

    // Check verified purchase
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .single();

    // Insert review through the user's own session: RLS enforces
    // user_id = auth.uid(), status='pending', verified_purchase=false.
    // verified_purchase is deliberately NEVER set by the client here — it
    // always starts false and is flipped to true below by the SERVICE ROLE
    // only when the purchases table proves the purchase, so a customer
    // cannot self-flag the badge by calling the database directly.
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        product_id,
        rating,
        title: title || null,
        content,
        verified_purchase: false,
        status: 'pending',
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Error creating review:', reviewError);
      return NextResponse.json(
        { error: 'Failed to submit review' },
        { status: 500 }
      );
    }

    // Server-owned verified badge: a REAL purchase was checked above. Flip
    // the flag via the service role (bypasses the RLS pin; the migration 005
    // trigger's service-role exemption keeps the write intact). The row is
    // the one we just created for THIS user — ownership guard included as
    // defense in depth.
    if (purchase) {
      const serviceClient = await createServiceClient();
      const { error: flagError } = await serviceClient
        .from('reviews')
        .update({
          verified_purchase: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', review.id)
        .eq('user_id', user.id);

      if (flagError) {
        // The review still exists and is pending moderation; the badge is a
        // display refinement, not the entitlement — log and continue.
        console.error('Error setting verified purchase flag:', {
          code: flagError.code,
        });
      }
    }

    return NextResponse.json({
      message: 'Review submitted successfully',
      review: {
        id: review.id,
        status: review.status,
      },
    });
  } catch (error) {
    console.error('Review submission error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
