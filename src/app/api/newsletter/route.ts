import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const newsletterSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = newsletterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Normalize the email (trim + lowercase) so duplicate detection is
    // reliable regardless of casing/spacing.
    const normalizedEmail = parsed.data.email.trim().toLowerCase();

    // Check for an existing subscription using the privileged client (the
    // anonymous client cannot SELECT newsletter_subscribers due to RLS).
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json(
          { message: 'You are already subscribed.' },
          { status: 200 }
        );
      }
      // Reactivate a previously unsubscribed record.
      const { error: reactivateError } = await supabase
        .from('newsletter_subscribers')
        .update({ status: 'active', subscribed_at: new Date().toISOString() })
        .eq('email', normalizedEmail);

      if (reactivateError) {
        console.error('Newsletter reactivation error:', reactivateError);
        return NextResponse.json(
          { error: 'Failed to reactivate subscription' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: 'Welcome back! Your subscription is active.' },
        { status: 200 }
      );
    }

    // Insert new subscriber. Protect against the UNIQUE constraint race
    // (two requests the same millisecond both pass the SELECT and try to
    // INSERT) — that should result in "already subscribed", not 500.
    let { error } = await supabase.from('newsletter_subscribers').insert({
      email: normalizedEmail,
      status: 'active',
    });

    if (error) {
      if (error.code === '23505') {
        // Unique violation on email — another request inserted the same
        // email between our SELECT and INSERT.
        return NextResponse.json(
          { message: 'You are already subscribed.' },
          { status: 200 }
        );
      }

      console.error('Newsletter subscription error:', {
        code: error.code,
        message: error.message,
      });
      return NextResponse.json(
        { error: 'Failed to subscribe' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Successfully subscribed!' });
  } catch (error) {
    console.error('Newsletter error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
