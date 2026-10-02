import { NextRequest, NextResponse } from 'next/server';
import { getSellerAccess } from '@/lib/seller';

/**
 * GET /api/seller/access — current seller access state for the session.
 *
 * Used by the "Become an Author" entry-point CTAs (navbar, drawer, announcement
 * bar, account page) to route the user to the right page (dashboard /
 * onboarding / pending / status) based on the authoritative server-side seller
 * profile. This is a ROUTING HINT only — never authorization. Returns no
 * private data beyond the status.
 */
export async function GET(_request: NextRequest) {
  const access = await getSellerAccess();
  switch (access.state) {
    case 'anonymous':
      return NextResponse.json({ state: 'anonymous' }, { status: 401 });
    case 'no-profile':
      return NextResponse.json({ state: 'no-profile' });
    case 'approved':
    case 'pending':
    case 'rejected':
    case 'suspended':
      return NextResponse.json({
        state: access.state,
        // Only safe display fields — never email/phone/approval metadata.
        display_name: access.profile.display_name,
      });
  }
}