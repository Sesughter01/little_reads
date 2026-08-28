-- ============================================
-- Newsletter Subscribers Table
-- ============================================
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for newsletter
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- Only admins can view subscribers
CREATE POLICY "Admins can view newsletter subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (is_admin(auth.uid()));

-- Only admins can update subscribers
CREATE POLICY "Admins can update newsletter subscribers"
  ON newsletter_subscribers FOR UPDATE
  USING (is_admin(auth.uid()));

-- ============================================
-- Note: Wishlist table already exists with proper
-- user_id column. The client-side wishlist in
-- localStorage serves as a fallback for logged-out
-- users. For logged-in users, the API should
-- use the database wishlist table.
-- ============================================
