import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    const supabase = await createClient();

    // Check for existing subscription
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', parsed.data.email)
      .single();

    if (existing) {
      return NextResponse.json(
        { message: 'You are already subscribed!' },
        { status: 200 }
      );
    }

    // Insert new subscriber
    const { error } = await supabase.from('newsletter_subscribers').insert({
      email: parsed.data.email,
      status: 'active',
    });

    if (error) {
      console.error('Newsletter subscription error:', error);
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
