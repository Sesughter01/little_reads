LITTLEREADS — APPROVED RELEASE EXECUTION

The final release-preparation report is accepted.

VERDICT:
READY TO COMMIT

Proceed with the release checkpoint.

==================================================
1. STAGE THE VERIFIED RELEASE FILES
==================================================

Run:

git status --short

The working tree must match the final READY-TO-COMMIT report:
- 30 modified/deleted tracked entries
- 13 intended untracked entries
- no diagnostic files
- no .env files
- no .next
- no logs
- no temporary files

Stage ONLY the exact files shown in that verified set.

IMPORTANT:
- use explicit file paths
- NO `git add .`
- NO `git add -A`
- NO wildcards such as src/app/(auth)/*
- NO broad directory staging

After staging run:

git status --short
git diff --cached --name-status
git diff --cached --stat

Confirm:
- only intended release files are staged
- no secrets
- no generated/debug files
- Migration 005 and 006 are included
- both security docs are included
- package.json contains `next build --webpack`

==================================================
2. COMMIT
==================================================

Commit with:

git commit -m "security: harden LittleReads and prepare staged privacy migration"

Then run:

git status --short
git log -1 --oneline

Working tree should be clean.

DO NOT push yet.

==================================================
3. STOP AFTER COMMIT
==================================================

Report:
- commit hash
- commit message
- staged/committed file count
- git status
- whether working tree is clean

Do NOT:
- apply Migration 005
- apply Migration 006
- push
- deploy
- merge

STOP after the commit report.# Migration 005 — Rollback Procedure (Documentation Only)

> **STATUS: DOCUMENTATION ONLY — DO NOT EXECUTE UNLESS a regression requires it.**
> This document describes how to restore the pre-005 database state if **Stage A**
> (Migration 005) causes an unexpected production regression. It is **not** an
> automatically executed rollback migration.
>
> 005 and 006 are NOT yet applied (as of this release-prep). If 005 has already
> been applied when you read this, the rollback below is the safe path back.

## 0. When to roll back

Apply this rollback ONLY if, after applying Migration 005 (Stage A), one of the
following is observed in the shared Preview/Production database:

- Public review pages stop rendering reviewer names (the `public_profiles_public`
  view path fails) **while only old-compatible code is deployed**.
- Review submission starts failing for normal customers.
- Service-role admin moderation of reviews stops working.
- A definer-function regression breaks profile/avatar reads for owners/admins.

Because Preview and Production share **one** Supabase database, rollback affects
both environments. Treat rollback as a coordinated action: stop preview deploys,
apply rollback, verify, then re-apply 005 when ready.

## 1. What Migration 005 creates or modifies

Migration 005 (Stage A) is **additive / backward compatible**. It:

1. **Creates** the SECURITY DEFINER view `public_profiles_public`:
   - `WITH (security_definer = true)`
   - SELECT list: `id`, `first_name`, `last_name`, `avatar_url` ONLY
   - narrowed to profiles having at least one `approved` review
   - grants: SELECT to `anon` and `authenticated`
2. **Creates / replaces** review policies on `reviews`:
   - `"Users can create own reviews"` (INSERT, pinned `status = 'pending'`,
     `verified_purchase = false`, `auth.uid() = user_id`)
   - `"Users can update own pending reviews"` (UPDATE, own + `status = 'pending'`)
3. **Creates** the BEFORE UPDATE trigger function and trigger
   `enforce_customer_review_moderation` on `reviews` (blocks non-service-role /
   non-admin status + `verified_purchase` flips).
4. **Replaces (hardens)** four SECURITY DEFINER functions with `SET search_path
   = public` + schema-qualified references:
   - `handle_new_user()`
   - `is_admin(user_id)`
   - `prevent_role_escalation()`
   - `update_updated_at_column()`
   (The `prevent_role_escalation` also gains an explicit `service_role`
   exemption in 005.)
5. **Leaves in place** (does NOT remove) the migration-004 blanket policy
   `"Public profiles are viewable by everyone"` on `profiles` for SELECT.

## 2. Objects created by 005

| Object | Type | Notes |
|---|---|---|
| `public_profiles_public` | SECURITY DEFINER VIEW | created |
| `enforce_customer_review_moderation()` | TRIGGER FUNCTION (BEFORE UPDATE on `reviews`) | created |
| `"Users can create own reviews"` (reviews) | RLS POLICY | re-created (replaces earlier same-name policy) |
| `"Users can update own pending reviews"` (reviews) | RLS POLICY | re-created |

## 3. Objects replaced (CREATE OR REPLACE) by 005

These functions are **replaced in place** — their pre-005 behavior is what the
rollback restores:

- `handle_new_user()`
- `is_admin(uuid)`
- `prevent_role_escalation()`
- `update_updated_at_column()`

## 4. Safe rollback SQL (restores pre-005 state)

Run in the Supabase SQL editor, in order. It restores the exact pre-005
behavior without touching unrelated application data.

```sql
-- ============================================
-- ROLLBACK of Migration 005 (Stage A)
-- ============================================
BEGIN;

-- 4.1 Drop the Stage A SECURITY DEFINER view.
DROP VIEW IF EXISTS public.public_profiles_public;

-- 4.2 Drop the Stage A moderation trigger + function.
DROP TRIGGER IF EXISTS enforce_customer_review_moderation ON public.reviews;
DROP FUNCTION IF EXISTS public.enforce_customer_review_moderation();

-- 4.3 Restore the pre-005 review INSERT policy.
--     (Re-creates the same policy name that 005 dropped and re-created.)
DROP POLICY IF EXISTS "Users can create own reviews" ON public.reviews;
CREATE POLICY "Users can create own reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4.4 Restore the pre-005 review UPDATE policy.
DROP POLICY IF EXISTS "Users can update own pending reviews" ON public.reviews;
CREATE POLICY "Users can update own pending reviews"
  ON public.reviews FOR UPDATE
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 4.5 Restore the pre-005 definer functions.
--     (These match migrations 001-004 definitions; adjust if your 001-004
--      definitions differ — copy the exact bodies from 001/004 instead.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Permission denied: cannot change user role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMIT;
```

> **IMPORTANT**: If your 001–004 definitions differ (e.g. older `handle_new_user`
> did **not** have `COALESCE`, or `prevent_role_escalation` did **not** use
> `IS DISTINCT FROM`), copy the exact function bodies from
> `supabase/migrations/001_initial_schema.sql` /
> `004_auth_hardening.sql` instead of the restore stubs above. The intent is:
> restore the exact pre-005 function behavior.

## 5. If Migration 006 (Stage B) was also applied

006 only drops `"Public profiles are viewable by everyone"` on `profiles`.
If rollback must also restore that blanket policy (i.e. if old production code
is still reading `user:profiles(...)` for public reviewer display), add:

```sql
-- Re-add the blanket public-profiles read (restores migration-004 behavior).
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
```

Only do this if 006 was applied AND old-compatible production code is still
deployed. In the normal Stage A/B sequence, 006 is NOT applied until compatible
code is deployed everywhere, so this step is usually unnecessary.

## 6. Verification after rollback

1. `SELECT * FROM public.public_profiles_public` → should error (`relation does
   not exist`) confirming the view is gone.
2. Public review pages (Preview and Production, whichever is being verified)
   render reviewer names via the pre-005 `user:profiles(...)` path (old blanket
   policy restored by 4.3–4.4 / section 5 as applicable).
3. Sign in as a customer → submit a review → it is created with `pending`.
4. Admin (service role) → approve/reject that review → succeeds (moderation
   path works).
5. Sign in as an owner → read own profile → succeeds.
6. Sign in as a normal customer → try `SELECT email FROM profiles` → the
   migration-004 policy is back, so this remains open until 006 is re-applied
   (expected for Stage A rollback).
7. `npm test` locally still passes, and the webpack build
   (`next build --webpack`) still completes.

## 7. After rollback — re-apply path

- Re-verify the pre-005 database is healthy (owner/admin reads, customer review
  submission, admin moderation).
- Re-run Migration 005 only after confirming the regression is understood and
  fixed, then re-verify per its own post-apply checklist.
- Keep Migration 006 unapplied until compatible code is deployed in BOTH
  Preview and Production.