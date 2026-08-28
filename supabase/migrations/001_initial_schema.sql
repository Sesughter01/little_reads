-- ============================================
-- LittleReads Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  author TEXT NOT NULL DEFAULT 'LittleReads Editorial Team',
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0), -- Store in Naira (smallest unit for display)
  sale_price INTEGER CHECK (sale_price IS NULL OR (sale_price >= 0 AND sale_price < price)),
  cover_url TEXT,
  pdf_path TEXT,
  age_min INTEGER NOT NULL CHECK (age_min >= 0 AND age_min <= 18),
  age_max INTEGER NOT NULL CHECK (age_max >= 0 AND age_max <= 18),
  reading_level TEXT NOT NULL DEFAULT 'Beginner',
  page_count INTEGER NOT NULL DEFAULT 0 CHECK (page_count >= 0),
  reading_time TEXT NOT NULL DEFAULT '5 min',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_age_range CHECK (age_min <= age_max)
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_published ON products(published);
CREATE INDEX idx_products_featured ON products(featured);

-- ============================================
-- PRODUCT LEARNING OUTCOMES
-- ============================================
CREATE TABLE product_learning_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_learning_outcomes_product ON product_learning_outcomes(product_id);

-- ============================================
-- PRODUCT KEYWORDS
-- ============================================
CREATE TABLE product_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL
);

CREATE INDEX idx_keywords_product ON product_keywords(product_id);
CREATE INDEX idx_keywords_keyword ON product_keywords(keyword);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT,
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  paystack_reference TEXT UNIQUE,
  payment_channel TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_reference ON orders(paystack_reference);

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  title_snapshot TEXT NOT NULL,
  price_snapshot INTEGER NOT NULL CHECK (price_snapshot >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================
-- PURCHASES
-- ============================================
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_product ON purchases(product_id);

-- ============================================
-- REVIEWS
-- ============================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_status ON reviews(status);

-- ============================================
-- WISHLIST
-- ============================================
CREATE TABLE wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlist_user ON wishlist(user_id);

-- ============================================
-- CONTACT MESSAGES
-- ============================================
CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_learning_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS POLICIES
-- ============================================

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE USING (is_admin(auth.uid()));

-- CATEGORIES
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL USING (is_admin(auth.uid()));

-- PRODUCTS
CREATE POLICY "Published products are viewable by everyone"
  ON products FOR SELECT USING (published = true OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage products"
  ON products FOR ALL USING (is_admin(auth.uid()));

-- PRODUCT LEARNING OUTCOMES
CREATE POLICY "Learning outcomes viewable with product"
  ON product_learning_outcomes FOR SELECT USING (true);

CREATE POLICY "Admins can manage learning outcomes"
  ON product_learning_outcomes FOR ALL USING (is_admin(auth.uid()));

-- PRODUCT KEYWORDS
CREATE POLICY "Keywords viewable with product"
  ON product_keywords FOR SELECT USING (true);

CREATE POLICY "Admins can manage keywords"
  ON product_keywords FOR ALL USING (is_admin(auth.uid()));

-- ORDERS
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Server can create orders"
  ON orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Server can update orders"
  ON orders FOR UPDATE USING (true);

-- ORDER ITEMS
CREATE POLICY "Users can view order items for own orders"
  ON order_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Server can create order items"
  ON order_items FOR INSERT WITH CHECK (true);

-- PURCHASES
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Server can create purchases"
  ON purchases FOR INSERT WITH CHECK (true);

-- REVIEWS
CREATE POLICY "Approved reviews viewable by everyone"
  ON reviews FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can create own reviews"
  ON reviews FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Users can update own pending reviews"
  ON reviews FOR UPDATE USING (
    auth.uid() = user_id AND status IN ('pending', 'approved')
  );

CREATE POLICY "Users can delete own pending reviews"
  ON reviews FOR DELETE USING (
    auth.uid() = user_id AND status IN ('pending', 'approved')
  );

CREATE POLICY "Admins can moderate reviews"
  ON reviews FOR ALL USING (is_admin(auth.uid()));

-- WISHLIST
CREATE POLICY "Users can view own wishlist"
  ON wishlist FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlist"
  ON wishlist FOR ALL USING (auth.uid() = user_id);

-- CONTACT MESSAGES
CREATE POLICY "Anyone can create contact messages"
  ON contact_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view contact messages"
  ON contact_messages FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update contact messages"
  ON contact_messages FOR UPDATE USING (is_admin(auth.uid()));

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL CATEGORIES
-- ============================================
INSERT INTO categories (name, slug, description) VALUES
  ('Adventure', 'adventure', 'Exciting journeys and quests'),
  ('Science', 'science', 'Discover how the world works'),
  ('Education', 'education', 'Learn new concepts through stories'),
  ('African Stories', 'african-stories', 'Stories from Africa for African children'),
  ('Life Skills', 'life-skills', 'Building character and confidence'),
  ('Nature', 'nature', 'Explore the natural world'),
  ('Friendship', 'friendship', 'Stories about friends and connection'),
  ('Bedtime Stories', 'bedtime-stories', 'Calm stories for bedtime'),
  ('Technology', 'technology', 'Computers, coding, and the digital world'),
  ('Science & Technology', 'science-technology', 'STEM stories for curious minds'),
  ('Entrepreneurship', 'entrepreneurship', 'Creativity and problem solving'),
  ('Environment', 'environment', 'Caring for our planet'),
  ('Money Skills', 'money-skills', 'Saving, spending, and financial literacy');
