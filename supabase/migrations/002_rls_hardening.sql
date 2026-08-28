-- ============================================
-- RLS HARDENING - LittleReads
-- ============================================
-- This migration tightens RLS policies to prevent
-- privilege escalation through direct database operations.

-- ============================================
-- DROP EXISTING OVERLY-PERMISSIVE POLICIES
-- ============================================

-- Orders: Remove the overly permissive INSERT policy
DROP POLICY IF EXISTS "Server can create orders" ON orders;
-- Orders: Remove the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Server can update orders" ON orders;

-- Order items: Remove overly permissive INSERT
DROP POLICY IF EXISTS "Server can create order items" ON order_items;

-- Purchases: Remove overly permissive INSERT
DROP POLICY IF EXISTS "Server can create purchases" ON purchases;

-- ============================================
-- NEW RESTRICTED POLICIES
-- ============================================

-- ORDERS INSERT: Only service role (via service client) can create orders.
-- This prevents any authenticated user from creating orders directly.
-- In practice, orders are created through the /api/checkout endpoint
-- which uses the service role client.
CREATE POLICY "Only service role can create orders"
  ON orders FOR INSERT
  WITH CHECK (false);  -- No direct client inserts allowed

-- ORDERS UPDATE: Only service role can update orders.
-- This prevents users from marking their own orders as 'paid'.
CREATE POLICY "Only service role can update orders"
  ON orders FOR UPDATE
  USING (false);  -- No direct client updates allowed

-- ORDER ITEMS INSERT: Only service role can create order items.
CREATE POLICY "Only service role can create order items"
  ON order_items FOR INSERT
  WITH CHECK (false);  -- No direct client inserts allowed

-- PURCHASES INSERT: Only service role can create purchase records.
-- This prevents users from granting themselves ebook access.
CREATE POLICY "Only service role can create purchases"
  ON purchases FOR INSERT
  WITH CHECK (false);  -- No direct client inserts allowed

-- ============================================
-- NOTE: All order/purchase creation now happens through
-- server-side API routes that use createServiceClient(),
-- which bypasses RLS entirely. This is the correct pattern:
--
-- Client → API Route → createServiceClient() → Database
--
-- The service role bypasses RLS, so these policies only
-- protect against direct database manipulation from
-- authenticated users.
-- ============================================

-- ============================================
-- WISHLIST: Keep existing permissive policies
-- (users can manage their own wishlist via RLS)
-- ============================================

-- ============================================
-- CONTACT MESSAGES: Keep existing policy
-- (anyone can submit, only admin can read)
-- ============================================
