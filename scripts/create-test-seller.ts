/**
 * scripts/create-test-seller.ts
 *
 * Creates or resets a dedicated test seller account for local development and
 * QA of the LittleReads seller system.
 *
 * The test account goes through the REAL seller state machine:
 *   auth.users  ->  profiles  ->  seller_profiles (pending)
 *                                          -> admin approves -> approved
 *
 * Email is confirmed server-side via the Supabase Admin API so no real email
 * is sent and no verification step is needed during testing.
 *
 * SAFETY GUARDS (all must pass or the script aborts):
 *   - NODE_ENV must not be "production".
 *   - LITTLEREADS_ENABLE_TEST_SELLER must be set to "true".
 *   - SUPABASE_SERVICE_ROLE_KEY must be set (server-side only, never browser-exposed).
 *
 * The script is IDEMPOTENT:
 *   - If the test user does not exist -> create it.
 *   - If it already exists -> reuse it and update profile/seller fields safely.
 *
 * DOES NOT:
 *   - weaken email verification for normal users
 *   - change /register or /login behavior
 *   - expose the service-role key to the browser
 *   - give the test account admin privileges
 *   - allow arbitrary users to bypass verification
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TEST_EMAIL = 'seller-test@littlereads.local';
const TEST_PASSWORD = 'lr-t3st-s3ll3r-2026!Q#X';
const TEST_FIRST_NAME = 'Test';
const TEST_LAST_NAME = 'Seller';
const TEST_DISPLAY_NAME = 'LittleReads Test Seller';
const TEST_BUSINESS_NAME = 'LittleReads QA Books';
const TEST_BIO =
  'Test seller account used exclusively for LittleReads development and QA.';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is not set.');
  console.error('   Set it in .env.local (must point to the correct project).');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set.');
  console.error('   Set it in .env.local (service-role key for the correct project).');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Safety guards — never run this in production
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === 'production') {
  console.error(
    'ERROR: ABORTED: NODE_ENV=production. This script must never run in production.'
  );
  process.exit(1);
}

if (process.env.LITTLEREADS_ENABLE_TEST_SELLER !== 'true') {
  console.error(
    'ERROR: ABORTED: LITTLEREADS_ENABLE_TEST_SELLER is not set to "true".\n' +
      '   To run this script:\n' +
      '     LITTLEREADS_ENABLE_TEST_SELLER=true npm run test:create-seller\n' +
      '   (or set the variable in your shell / .env.local for the session)'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskedEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 3) return email;
  return `${local[0]}***@${domain}`;
}

function maskedId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 8)}...`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Step 1 — find or create the auth user
  console.log('Looking up test user by email...');
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('ERROR: Failed to list users:', listError.message);
    process.exit(1);
  }

  const existing = existingUsers?.users?.find((u) => u.email === TEST_EMAIL);
  let authUserId: string;
  let emailPreConfirmed = false;

  if (existing) {
    authUserId = existing.id;
    emailPreConfirmed = !!(existing.email_confirmed_at || existing.confirmed_at);
    console.log(
      `   Found existing test user: ${maskedId(authUserId)}  email=${maskedEmail(TEST_EMAIL)}  confirmed=${emailPreConfirmed}`
    );
  } else {
    console.log(`   Not found — creating test user...`);
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: TEST_FIRST_NAME,
        last_name: TEST_LAST_NAME,
      },
    });

    if (createError) {
      console.error('ERROR: Failed to create test user:', createError.message);
      process.exit(1);
    }

    if (!created?.user) {
      console.error('ERROR: createUser returned no user data.');
      process.exit(1);
    }

    authUserId = created.user.id;
    emailPreConfirmed = true;
    console.log(
      `   Created test user: ${maskedId(authUserId)}  email=${maskedEmail(TEST_EMAIL)}`
    );
  }

  if (!emailPreConfirmed) {
    console.log('   Confirming email server-side...');
    const { error: confirmError } = await supabase.auth.admin.updateUserById(authUserId, {
      email_confirm: true,
    });
    if (confirmError) {
      console.error('ERROR: Failed to confirm email:', confirmError.message);
      process.exit(1);
    }
    console.log('   Email confirmed.');
  }

  // Step 2 — ensure the public profile exists
  console.log('Ensuring public profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', authUserId)
    .maybeSingle();

  if (profileError && profileError.code !== 'PGRST205') {
    console.error('ERROR: Profile lookup failed:', profileError.message);
    process.exit(1);
  }

  if (!profile) {
    console.log('   Profile not found — creating it...');
    const { error: insertProfileError } = await supabase.from('profiles').insert({
      id: authUserId,
      first_name: TEST_FIRST_NAME,
      last_name: TEST_LAST_NAME,
      email: TEST_EMAIL,
      role: 'customer',
    });

    if (insertProfileError) {
      console.error('ERROR: Failed to create profile:', insertProfileError.message);
      process.exit(1);
    }
    console.log('   Profile created.');
  } else {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: TEST_FIRST_NAME,
        last_name: TEST_LAST_NAME,
        email: TEST_EMAIL,
        role: 'customer',
      })
      .eq('id', authUserId);

    if (updateError) {
      console.error('ERROR: Failed to update profile:', updateError.message);
      process.exit(1);
    }
  }

  // Step 3 — ensure the seller profile exists
  console.log('Ensuring seller profile...');
  let sellerProfile:
    | {
        user_id: string;
        display_name: string;
        business_name: string | null;
        bio: string | null;
        status: string;
        approved_at: string | null;
        approved_by: string | null;
        created_at: string;
        updated_at: string;
      }
    | null = null;

  const { data: sellerProfileData, error: sellerError } = await supabase
    .from('seller_profiles')
    .select('*')
    .eq('user_id', authUserId)
    .maybeSingle();

  if (sellerError && sellerError.code !== 'PGRST205') {
    console.error('ERROR: Seller profile lookup failed:', sellerError.message);
    console.error(
      '   NOTE: If you see PGRST205 above, migration 007 has not been applied to the database.'
    );
    process.exit(1);
  }

  sellerProfile = sellerProfileData;

  if (!sellerProfile) {
    console.log('   Seller profile not found — creating as PENDING...');
    const { error: insertError } = await supabase.from('seller_profiles').insert({
      user_id: authUserId,
      display_name: TEST_DISPLAY_NAME,
      business_name: TEST_BUSINESS_NAME,
      bio: TEST_BIO,
      status: 'pending',
    });

    if (insertError) {
      console.error('ERROR: Failed to create seller profile:', insertError.message);
      console.error(
        '   NOTE: If the error mentions PGRST205 or "table not found",'
      );
      console.error(
        '   migration 007 has not been applied to the database.'
      );
      process.exit(1);
    }

    // Refetch to get the actual status
    const { data: refetched } = await supabase
      .from('seller_profiles')
      .select('*')
      .eq('user_id', authUserId)
      .maybeSingle();
    if (refetched) {
      sellerProfile = refetched as {
        user_id: string;
        display_name: string;
        business_name: string | null;
        bio: string | null;
        status: string;
        approved_at: string | null;
        approved_by: string | null;
        created_at: string;
        updated_at: string;
      };
    }
    console.log(`   Seller profile created — status: ${sellerProfile?.status ?? 'unknown'}.`);
  } else {
    const { error: updateError } = await supabase
      .from('seller_profiles')
      .update({
        display_name: TEST_DISPLAY_NAME,
        business_name: TEST_BUSINESS_NAME,
        bio: TEST_BIO,
      })
      .eq('user_id', authUserId);

    if (updateError) {
      console.error('ERROR: Failed to update seller profile:', updateError.message);
      process.exit(1);
    }
    console.log(
      `   Seller profile exists — status: ${sellerProfile.status}  (display fields updated)`
    );
  }

  // Summary
  console.log('');
  console.log('============================================================');
  console.log('TEST SELLER ACCOUNT READY');
  console.log('============================================================');
  console.log(`   Name:         ${TEST_FIRST_NAME} ${TEST_LAST_NAME}`);
  console.log(`   Email:        ${TEST_EMAIL}`);
  console.log(`   Password:     ${TEST_PASSWORD}`);
  console.log(`   User ID:      ${authUserId}`);
  console.log(`   Profile ID:   ${authUserId} (profiles.id = auth.users.id)`);
  if (sellerProfile) {
    console.log(`   Seller ID:    ${sellerProfile.user_id} (seller_profiles.user_id)`);
    console.log(`   Status:       ${sellerProfile.status}`);
  } else {
    console.log(`   Seller ID:    (not created — migration 007 may be missing)`);
    console.log(`   Status:       N/A`);
  }
  console.log(`   Email verified: ${emailPreConfirmed ? 'YES (server-side)' : 'NO'}`);
  console.log('============================================================');
  console.log('');
  console.log('How to use this account:');
  console.log('   1. Log in at /login with the email and password above.');
  console.log('   2. Seller access state is determined by seller_profiles.status:');
  console.log('      - pending   -> /seller/pending');
  console.log('      - approved  -> /seller (dashboard)');
  console.log('      - rejected  -> /seller/status');
  console.log('      - suspended -> /seller/status');
  console.log('');
  console.log('To reset/recreate (idempotent):');
  console.log('   LITTLEREADS_ENABLE_TEST_SELLER=true npm run test:create-seller');
  console.log('');
  console.log('WARNING: This account is for LOCAL/DEVELOPMENT/QA use only.');
  console.log('         It must never be used in production.');
  console.log('');

  // State-switching guide
  console.log('============================================================');
  console.log('STATE SWITCHING GUIDE');
  console.log('============================================================');
  console.log('');
  console.log('The test seller starts as PENDING (real application flow).');
  console.log('To test other states, use ONE of these methods:');
  console.log('');
  console.log('METHOD A — Admin dashboard (recommended for QA):');
  console.log('   1. Log in as admin at /admin/login');
  console.log('   2. Go to /admin/sellers');
  console.log('   3. Find "LittleReads Test Seller"');
  console.log('   4. Use Approve / Reject / Suspend buttons');
  console.log('');
  console.log('METHOD B — Admin API (for automation/CI):');
  console.log('   curl -X PATCH http://localhost:3005/api/admin/sellers/<USER_ID>');
  console.log('     -H "Content-Type: application/json"');
  console.log('     -d \'{"status":"approved"}\'');
  console.log('   (replace approved with rejected/suspended/pending as needed)');
  console.log('   (requires admin session cookies)');
  console.log('');
  console.log('METHOD C — Direct database (via Supabase SQL Editor):');
  console.log('   UPDATE public.seller_profiles');
  console.log('   SET status = \'approved\',');
  console.log('       approved_at = now(),');
  console.log('       approved_by = \'<admin-user-id>\'');
  console.log('   WHERE user_id = \'<test-user-id>\';');
  console.log('');
  console.log('============================================================');
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
