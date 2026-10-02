-- ============================================
-- STAGE B — RESTRICTIVE / FINAL PRIVACY LOCKDOWN - LittleReads
-- ============================================
-- Apply ONLY AFTER compatible app code is deployed EVERYWHERE
-- (Preview AND Production embed
-- `user:public_profiles_public(id, first_name, last_name, avatar_url)`
-- in getProductReviews — src/lib/db.ts in the working tree).
--
-- WHAT THIS DOES:
--   Drops the blanket policy from migration 004:
--     "Public profiles are viewable by everyone"
--     (ON profiles FOR SELECT USING (true))
--   After this, direct profiles reads are owner/admin-only (+ service
--   role which bypasses RLS). Public reviewer display flows exclusively
--   through the SECURITY DEFINER view public_profiles_public created in
--   Stage A (005), which exposes ONLY id / first_name / last_name /
--   avatar_url of users with >= 1 approved review.
--
-- WHY THE ORDER MATTERS:
--   Old production code embeds `user:profiles(id, first_name, last_name)`.
--   If this DROP ran before the code cutover, anonymous review pages
--   would silently lose all reviewer names (the query errors under RLS
--   and getProductReviews returns []). Stage A (005) keeps the blanket
--   policy precisely so that cannot happen.
--
-- PRE-APPLY CHECKLIST:
--   1. Stage A (005) applied.
--   2. Preview deployed from code embedding public_profiles_public; public
--      review pages show reviewer names.
--   3. Production deployed from the same compatible code; public review
--      pages show reviewer names.
--   4. No remaining deployed code references `user:profiles(` for public
--      reviewer display (grep origin/main AND preview branch).
--
-- POST-APPLY VERIFICATION (Supabase SQL editor, anon key):
--   1. Public reviews still show names (view path works).
--   2. Direct `SELECT email FROM profiles` as anon returns 0 rows.
--   3. Owner can still read own profile; admin reads still work.
--
-- NO other changes. No policy/trigger duplication (all review policies,
-- triggers, and definer hardening already landed in Stage A).

-- The single restrictive step: remove the blanket public read.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

COMMENT ON TABLE profiles IS
  'Stage B (006): direct reads are owner/admin-only (plus service role). Public reviewer display goes through public_profiles_public (SECURITY DEFINER view).';
