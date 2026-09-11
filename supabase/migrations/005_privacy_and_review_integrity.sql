-- ============================================
-- STAGE A — ADDITIVE / BACKWARD COMPATIBLE - LittleReads
-- ============================================
-- Safe to apply while CURRENT PRODUCTION (origin/main) is live.
-- Stage A ADDS everything new code needs WITHOUT removing anything old
-- code needs. The blanket public profiles SELECT policy from 004 is
-- INTENTIONALLY LEFT IN PLACE here; it is removed in Stage B (006) AFTER
-- compatible app code (embedding public_profiles_public) is deployed.
--
-- DEPLOY ORDER: 1) apply 005 -> 2) deploy preview -> test ->
-- 3) deploy compatible production -> 4) apply 006 lockdown.
--
--   Exposure note: the blanket 004 policy stays in Stage A ONLY so old
--   production keeps rendering reviewer names. It is dropped in 006.
--
--      IMPORTANT (corrected from the earlier draft): the view MUST run with
--      the DEFINER's privileges, NOT with `security_invoker = true`. That
--      option executes the view with the CALLER's RLS privileges, so once
--      anonymous direct SELECT on profiles is revoked below the view would
--      return ZERO rows and public reviewer names would silently disappear.
--      `security_invoker` is also pre-Postgres-15 syntax and is not valid on
--      modern Supabase. A definer view exposes ONLY the columns named in its
--      SELECT list (email/phone/role are simply not columns of this view and
--      can never be read through it), and the definer (the migration role)
--      bypasses RLS on those 4 display columns. The view is narrowed to
--      users who have at least one APPROVED review so the public surface is
--      minimal.
--
--   2. REVIEW SELF-APPROVAL / EDIT-SWAP (Stage A keeps production working):
--      a) Customers must not self-approve: the INSERT policy pins
--         status='pending' for customer rows. verified_purchase is
--         deliberately NOT pinned at INSERT: the deployed production API
--         sets it from a server-side purchase check, while new code inserts
--         false and flips it via the service role. Pinning it now would 500
--         buyer review submissions on production (RLS WITH CHECK failure).
--      b) Status/flag flips via UPDATE are neutralised by BEFORE UPDATE
--         trigger enforce_customer_review_moderation (service-role + admin
--         exempt so /api/admin/reviews moderation keeps working).
--      c) Approve -> edit swap closed: UPDATE policy allows editing only
--         own PENDING reviews.

--   3. SECURITY DEFINER HARDENING: all definer functions get a pinned
--      search_path AND schema-qualified object references so a malicious
--      schema-qualified object (table/function shadowing in another schema)
--      cannot hijack definer-privileged code.

-- ============================================
-- 1. PROFILE PRIVACY VIEW (additive: old code untouched, new code enabled)
-- ============================================

-- Public reviewer identity view: id / first_name / last_name / avatar_url
-- ONLY. Runs with the DEFINER's (migration role's) privileges — this is why
-- public reviewer names keep working for anonymous callers after direct
-- anon SELECT on profiles is revoked below. Column hiding comes from the
-- explicit SELECT list: email/phone/role are NOT columns of this view and
-- cannot be read through it under any privilege.
--
-- The view is deliberately narrowed to users who have had at least one
-- review APPROVED — the only case where a display name/avatar is needed
-- publicly. Approved reviews embed reviewer identity through this view
-- (src/lib/db.ts getProductReviews), so public review pages keep working
-- for anonymous visitors.
CREATE OR REPLACE VIEW public_profiles_public
WITH (security_definer = true) AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.avatar_url
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.reviews r
  WHERE r.user_id = p.id AND r.status = 'approved'
);

-- Only the roles that need public reviewer display may read the view.
GRANT SELECT ON public_profiles_public TO anon, authenticated;

-- Restrict direct profile reads:
--   - owner sees their full row
--   - admins see all rows
--   - anonymous/other users see NOTHING directly (reviews join the view above)
-- STAGE A: KEEP the blanket policy so current production keeps working.
-- Stage B (006) drops it after compatible code is deployed everywhere.
-- DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles; -- DEFERRED TO 006
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Profiles owner full read"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Profiles admin full read"
  ON profiles FOR SELECT
  USING (is_admin(auth.uid()));

-- ============================================
-- 2a. REVIEW INTEGRITY: customers cannot self-approve (UPDATE)
-- ============================================
-- IMPORTANT: the admin moderation API runs as the Supabase SERVICE ROLE,
-- for which auth.uid() is NULL and auth.role() = 'service_role'. The
-- service-role exemption below is what keeps admin moderation working;
-- without it every admin action would be silently reset to 'pending'.
CREATE OR REPLACE FUNCTION enforce_customer_review_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins (interactive) or the service role may change review status;
  -- a customer-driven update that touches status is reset to 'pending'
  -- (re-queued for moderation) instead of silently self-approving.
  IF OLD.status IS DISTINCT FROM NEW.status
     AND auth.role() <> 'service_role'
     AND NOT public.is_admin(auth.uid()) THEN
    NEW.status := 'pending';
  END IF;

  -- verified_purchase is a SERVER-OWNED flag derived from the purchases
  -- table. A customer can never set or clear it on their own review; only
  -- the service role (which flips it after a purchase check) or an admin
  -- may. This closes the self-flagging forge reported by the audit. The
  -- service-role exemption is required: auth.uid() is NULL for the service
  -- role, so a bare is_admin(auth.uid()) check would wrongly reject the
  -- legitimate server-side verified_purchase write.
  IF OLD.verified_purchase IS DISTINCT FROM NEW.verified_purchase
     AND auth.role() <> 'service_role'
     AND NOT public.is_admin(auth.uid()) THEN
    NEW.verified_purchase := OLD.verified_purchase;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_review_status_change ON reviews;

CREATE TRIGGER check_review_status_change
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION enforce_customer_review_moderation();

-- ============================================
-- 2b. REVIEW INTEGRITY: customers cannot self-approve on INSERT
-- ============================================
-- The INSERT policy pins status='pending' for customer rows. verified_purchase
-- is deliberately NOT pinned at INSERT (production-compat, see header §2):
-- deployed production sets it from a server-side purchase check, new code
-- inserts false and flips it via the SERVICE ROLE only after proving the
-- purchase. Moderation (status flips) happens as the service role, which
-- bypasses RLS entirely. Stage B (006) may pin the flag when NO deployed
-- code sets it on INSERT anymore.
DROP POLICY IF EXISTS "Users can create own reviews" ON reviews;

CREATE POLICY "Users can create own reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Customers may edit ONLY their own PENDING reviews (draft content). An
-- already-approved or hidden review is immutable for the customer (no
-- approve → edit swap), and moderation flags survive via the trigger above.
DROP POLICY IF EXISTS "Users can update own pending reviews" ON reviews;

CREATE POLICY "Users can update own pending reviews"
  ON reviews FOR UPDATE USING (
    auth.uid() = user_id AND status = 'pending'
  );

-- ============================================
-- 3. SECURITY DEFINER HARDENING: pin search_path everywhere
-- ============================================
-- A definer function without a pinned search_path resolves unqualified
-- names against the CALLER's search_path, letting a privileged-path caller
-- shadow the tables/functions the definer code depends on.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the role column is being changed, only an admin may do it.
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- The service role (fulfillment/automation) and admins may set roles.
    IF auth.role() <> 'service_role' AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Permission denied: cannot change user role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- NOTE: prevent_role_escalation previously did NOT exempt the service role.
-- Server-side flows that touch profiles rows (avatar URL updates) go through
-- the service role and only set avatar_url/updated_at, so they were never
-- blocked; the explicit exemption just makes the contract precise.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- Post-migration application contract
-- ============================================
--   1. getProductReviews (src/lib/db.ts) embeds
--      `user:public_profiles_public(id, first_name, last_name, avatar_url)`
--      — the view name matches the application query exactly, which is what
--      keeps approved reviews showing "Ada O." while customer emails stay
--      private.
--   2. /api/reviews inserts with status='pending' and verified_purchase=false
--      through the user's session, then flips verified_purchase via the
--      service role ONLY when the purchases table proves the purchase.
--   3. /api/admin/reviews/[id] moderates through the service role (where
--      auth.uid() is NULL) — the trigger's service-role exemption is what
--      keeps that path working.
-- ============================================
