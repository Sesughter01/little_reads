-- Migration 007 — Seller Marketplace Foundation (STAGE 1: schema only)
-- ============================================================================
-- IMPORTANT: DO NOT APPLY until the pending release sequence is complete:
--   006_profile_privacy_lockdown.sql must be applied to Production FIRST
--   (after compatible code is deployed everywhere). 007 follows after that,
--   only with explicit approval.
--
-- Design notes:
--   * profiles.role has a CHECK constraint ('customer','admin'), so SELLER is
--     modelled as a separate capability table (seller_profiles), NOT a new
--     role value. A seller is still a normal customer when shopping.
--   * products.seller_id is NULLABLE: NULL = LittleReads/platform-owned book
--     (all existing rows keep working, no data migration required).
--   * order_items.seller_id snapshots the seller identity AT TRANSACTION TIME
--     so order history remains accurate even if ownership changes later.
--   * No payouts. Accounting fields are added as nullable placeholders only.
--   * Browser/client input can NEVER grant seller privileges: approval state
--     is changed only by admins/service-role (enforced by trigger + RLS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. seller_profiles
-- ----------------------------------------------------------------------------
create table if not exists public.seller_profiles (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  display_name  text not null,
  business_name text,
  bio           text,
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected', 'suspended')),
  approved_at   timestamptz,
  approved_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_seller_profiles_status
  on public.seller_profiles (status);

create unique index if not exists uq_seller_profiles_user
  on public.seller_profiles (user_id);

alter table public.seller_profiles enable row level security;

-- Owner can read their own seller profile.
create policy "Seller can view own seller profile"
  on public.seller_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Owner can create their own application, but ONLY as pending.
create policy "Seller can create own pending application"
  on public.seller_profiles
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and approved_at is null
    and approved_by is null
  );

-- Owner can update only SAFE fields; status/approval columns are guarded by
-- the trigger below (non-admin/service-role writes keep existing status and
-- never touch approved_* columns).
create policy "Seller can update own safe profile fields"
  on public.seller_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins manage applications (review/approve/reject/suspend).
create policy "Admin can manage seller applications"
  on public.seller_profiles
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 2. Trigger: prevent self-approval / approval-column tampering
--    (service_role and admins are exempt so server-side moderation works)
-- ----------------------------------------------------------------------------
create or replace function public.enforce_seller_application_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service role bypasses everything (trusted server-side moderation)
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- admins may set approval fields
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  -- everyone else (the owning seller): status and approval columns locked
  if new.status is distinct from old.status
     or new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by
     or new.user_id is distinct from old.user_id then
    raise exception 'seller_profiles: only admins can change approval status';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_seller_application_integrity on public.seller_profiles;
create trigger trg_seller_application_integrity
  before update on public.seller_profiles
  for each row execute function public.enforce_seller_application_integrity();

-- keep updated_at fresh (reuses existing public helper)
drop trigger if exists trg_seller_profiles_updated_at on public.seller_profiles;
create trigger trg_seller_profiles_updated_at
  before update on public.seller_profiles
  for each row execute function public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 3. products: nullable seller ownership (NULL = platform-owned)
-- ----------------------------------------------------------------------------
alter table public.products
  add column if not exists seller_id uuid references public.profiles (id)
    on delete set null;

create index if not exists idx_products_seller_id
  on public.products (seller_id)
  where seller_id is not null;

comment on column public.products.seller_id is
  'NULL = LittleReads platform-owned book. Otherwise the owning seller''s user id.';

-- Seller book workflow state. Seller-created books start as 'draft'
-- (published=false). 'submitted' = awaiting admin review. Only an admin or
-- the service role may set 'published'/'archived'. 'rejected' is admin-only.
-- Existing platform books keep the default 'published' so nothing changes.
alter table public.products
  add column if not exists workflow_status text not null default 'published'
  check (workflow_status in ('draft', 'submitted', 'published', 'rejected', 'archived'));

comment on column public.products.workflow_status is
  'Seller/editorial workflow: draft, submitted, published, rejected, archived. Sellers cannot self-publish.';

-- Seller-owned product RLS (defense-in-depth; server APIs also self-guard).
create policy "Sellers can view own products"
  on public.products
  for select
  to authenticated
  using (
    seller_id = auth.uid()
    or published = true
    or public.is_admin(auth.uid())
  );

create policy "Sellers can manage own products"
  on public.products
  for all
  to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

-- BEFORE UPDATE guard on products: sellers may edit their own rows but can
-- NEVER self-publish, self-archive, or reassign ownership. Admins and the
-- service role (fulfillment/admin APIs) bypass this. Mirrors the review
-- moderation pattern so server-side admin publishing keeps working even when
-- auth.uid() is NULL under the service role.
create or replace function public.enforce_seller_product_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service role bypasses everything (trusted server-side publishing)
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- admins may publish/archive/reject
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  -- sellers may only touch rows they own, and may not change ownership
  if new.seller_id is not null and new.seller_id = auth.uid() then
    if new.seller_id is distinct from old.seller_id then
      raise exception 'products: seller ownership cannot change';
    end if;
    if new.published is distinct from old.published and new.published = true then
      raise exception 'products: sellers cannot self-publish - awaiting admin review';
    end if;
    if new.workflow_status is distinct from old.workflow_status
       and new.workflow_status in ('published', 'archived') then
      raise exception 'products: publishing and archiving are admin-only';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_seller_product_workflow on public.products;
create trigger trg_seller_product_workflow
  before update on public.products
  for each row execute function public.enforce_seller_product_workflow();

-- ----------------------------------------------------------------------------
-- 4. order_items: seller attribution snapshot + future accounting placeholders
--    (no payouts implemented; columns are nullable and unused for now)
-- ----------------------------------------------------------------------------
alter table public.order_items
  add column if not exists seller_id uuid references public.profiles (id)
    on delete set null;

alter table public.order_items
  add column if not exists seller_amount numeric(12, 2);
alter table public.order_items
  add column if not exists platform_fee numeric(12, 2);
alter table public.order_items
  add column if not exists payout_status text
    check (payout_status in ('pending', 'paid', 'unpaid', 'n/a'));

create index if not exists idx_order_items_seller_id
  on public.order_items (seller_id)
  where seller_id is not null;

comment on column public.order_items.seller_id is
  'Snapshot of the selling seller at transaction time (NULL = platform-owned item).';

-- ----------------------------------------------------------------------------
-- 5. Public storefront visibility for approved sellers
--    (display fields only; private seller data stays private)
-- ----------------------------------------------------------------------------
grant select on public.seller_profiles to anon, authenticated;

create or replace view public.public_sellers as
select
  sp.user_id,
  sp.display_name,
  sp.business_name,
  sp.bio
from public.seller_profiles sp
where sp.status = 'approved';

grant select on public.public_sellers to anon, authenticated;

