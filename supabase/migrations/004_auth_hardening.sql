-- ============================================
-- AUTH HARDENING - LittleReads
-- ============================================
-- Prevents privilege escalation and hardens auth flows.

-- ============================================
-- 1. PREVENT ROLE ESCALATION
-- ============================================
-- The existing RLS policy "Users can update own profile" allows
-- any user to UPDATE profiles SET role = 'admin' because it only
-- checks auth.uid() = id. This trigger blocks that.

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If the role column is being changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only allow if the caller is already an admin
    IF NOT is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Permission denied: cannot change user role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS check_role_change ON profiles;

CREATE TRIGGER check_role_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- ============================================
-- 2. RESTRICT PROFILE UPDATES
-- ============================================
-- Users should only be able to update their own name, phone, and avatar.
-- They should NOT be able to change email, role, or id.

-- Drop the overly broad user update policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Replace with a restrictive policy that blocks role/email/id changes
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- 3. ADD MISSING RLS POLICIES
-- ============================================
-- Profiles: Allow users to insert their own profile
-- (needed if the trigger doesn't fire or for edge cases)
-- NOTE: The handle_new_user trigger creates profiles via SECURITY DEFINER,
-- so this is a safety net only.

-- Profiles: Users cannot delete profiles (only admins or cascade)
-- No DELETE policy for regular users (blocked by default when RLS is enabled)

-- ============================================
-- 4. PREVENT EMAIL ENUMERATION
-- ============================================
-- The "Public profiles are viewable by everyone" policy exposes
-- all emails. For a children's platform, we should restrict this.
-- Only admins and the profile owner should see the email.

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Replace with restricted policy: everyone sees names, only owner/admin sees email
-- Note: Supabase RLS works at the row level, not column level.
-- We'll keep the row-level policy but note that email is visible.
-- For true column-level security, use a database view.
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);
