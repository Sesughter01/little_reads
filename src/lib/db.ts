import {
  createClient,
  createPublicClient,
  createServiceClient,
} from '@/lib/supabase/server';
import type {
  Product,
  ProductWithDetails,
  Category,
  Order,
  Purchase,
  Review,
  Profile,
  DashboardStats,
  Wishlist,
} from '@/types';

// Products
export async function getProducts(params?: {
  category?: string;
  age_min?: number;
  age_max?: number;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  search?: string;
  sort?: string;
  featured?: boolean;
  published?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ products: Product[]; total: number }> {
  // Public catalog reads use the anonymous cookie-less client — no request
  // cookies required, so /shop and / can render without dynamic server usage.
  const supabase = await createPublicClient();

  let query = supabase
    .from('products')
    .select('*, category:categories(*)', { count: 'exact' });

  if (params?.published !== false) {
    query = query.eq('published', true);
  }

  if (params?.featured) {
    query = query.eq('featured', true);
  }

  if (params?.category) {
    const { data: cat, error: catErr } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', params.category)
      .maybeSingle();

    if (catErr) {
      console.error('Category lookup failed:', catErr.message, catErr.code);
      return { products: [], total: 0 };
    }

    if (cat) {
      query = query.eq('category_id', cat.id);
    } else {
      return { products: [], total: 0 };
    }
  }

  if (params?.age_min) {
    query = query.gte('age_max', params.age_min);
  }

  if (params?.age_max) {
    query = query.lte('age_min', params.age_max);
  }

  if (params?.min_price) {
    query = query.gte('price', params.min_price);
  }

  if (params?.max_price) {
    query = query.lte('price', params.max_price);
  }

  if (params?.search) {
    query = query.or(
      `title.ilike.%${params.search}%,short_description.ilike.%${params.search}%,author.ilike.%${params.search}%`
    );
  }

  switch (params?.sort) {
    case 'price-asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price-desc':
      query = query.order('price', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'rating':
      // We'll sort by average rating after fetching
      query = query.order('created_at', { ascending: false });
      break;
    default:
      query = query
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });
  }

  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    return { products: [], total: 0 };
  }

  const products = (data || []) as Product[];

  // Fetch ratings
  const productsWithRatings = await Promise.all(
    products.map(async (product) => {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', product.id)
        .eq('status', 'approved');

      const avg =
        reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      return {
        ...product,
        average_rating: Math.round(avg * 10) / 10,
        review_count: reviews?.length || 0,
      };
    })
  );

  if (params?.sort === 'rating') {
    productsWithRatings.sort(
      (a, b) => (b.average_rating || 0) - (a.average_rating || 0)
    );
  }

  return { products: productsWithRatings, total: count || 0 };
}

export async function getProductBySlug(
  slug: string
): Promise<ProductWithDetails | null> {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      *,
      category:categories(*),
      learning_outcomes:product_learning_outcomes(*),
      keywords:product_keywords(*)
    `
    )
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error || !data) return null;

  // Get rating info
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('product_id', data.id)
    .eq('status', 'approved');

  const avg =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return {
    ...data,
    average_rating: Math.round(avg * 10) / 10,
    review_count: reviews?.length || 0,
  } as ProductWithDetails;
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return data as Product;
}

// Categories
export async function getCategories(): Promise<Category[]> {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) return [];

  return (data || []) as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  return data as Category;
}

// Related books
export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  ageMin: number,
  ageMax: number,
  limit = 4
): Promise<Product[]> {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .neq('id', productId)
    .eq('published', true)
    .or(
      `category_id.eq.${categoryId},and(age_min.gte.${ageMin - 1},age_max.lte.${ageMax + 1})`
    )
    .limit(limit);

  if (error) return [];

  const products = (data || []) as Product[];

  const withRatings = await Promise.all(
    products.map(async (product) => {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', product.id)
        .eq('status', 'approved');

      const avg =
        reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      return {
        ...product,
        average_rating: Math.round(avg * 10) / 10,
        review_count: reviews?.length || 0,
      };
    })
  );

  return withRatings;
}

// Orders
export async function createOrder(order: {
  user_id?: string;
  customer_email: string;
  customer_name: string;
  phone?: string;
  subtotal: number;
  total: number;
  currency?: string;
  paystack_reference: string;
}): Promise<Order | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: order.user_id || null,
      customer_email: order.customer_email,
      customer_name: order.customer_name,
      phone: order.phone || null,
      subtotal: order.subtotal,
      total: order.total,
      currency: order.currency || 'NGN',
      status: 'pending',
      paystack_reference: order.paystack_reference,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating order:', error);
    return null;
  }

  return data as Order;
}

export async function createOrderItems(
  orderId: string,
  items: { product_id: string; title_snapshot: string; price_snapshot: number }[]
): Promise<boolean> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from('order_items').insert(
    items.map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      title_snapshot: item.title_snapshot,
      price_snapshot: item.price_snapshot,
    }))
  );

  return !error;
}

export async function getOrder(reference: string): Promise<Order | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('paystack_reference', reference)
    .single();

  if (error || !data) return null;

  return data as Order;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return data as Order;
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];

  return (data || []) as Order[];
}

// Purchases
export async function createPurchase(purchase: {
  user_id: string;
  product_id: string;
  order_id: string;
}): Promise<Purchase | null> {
  const supabase = await createServiceClient();

  // Check for existing purchase (idempotency)
  const { data: existing } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', purchase.user_id)
    .eq('product_id', purchase.product_id)
    .single();

  if (existing) return existing as Purchase;

  const { data, error } = await supabase
    .from('purchases')
    .insert({
      user_id: purchase.user_id,
      product_id: purchase.product_id,
      order_id: purchase.order_id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating purchase:', error);
    return null;
  }

  return data as Purchase;
}

export async function getUserPurchases(userId: string): Promise<Purchase[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('purchases')
    .select('*, product:products(*, category:categories(*))')
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false });

  if (error) return [];

  return (data || []) as Purchase[];
}

export async function hasUserPurchased(
  userId: string,
  productId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single();

  return !!data;
}

// Reviews
export async function getProductReviews(
  productId: string
): Promise<Review[]> {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from('reviews')
    .select('*, user:profiles(id, first_name, last_name)')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) return [];

  return (data || []) as Review[];
}

export async function getUserReviews(userId: string): Promise<Review[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reviews')
    .select('*, product:products(id, title, slug, cover_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];

  return (data || []) as Review[];
}

// Cart helpers
export async function getCartProducts(productIds: string[]): Promise<Product[]> {
  if (productIds.length === 0) return [];

  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .in('id', productIds)
    .eq('published', true);

  if (error) return [];

  return (data || []) as Product[];
}

// Profile
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return data as Profile;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return data?.role === 'admin';
}

// Admin stats
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createServiceClient();

  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  const [
    ordersResult,
    productsResult,
    customersResult,
    paidOrdersResult,
    monthOrdersResult,
    pendingOrdersResult,
  ] = await Promise.all([
    supabase.from('orders').select('total', { count: 'exact' }),
    supabase.from('products').select('id', { count: 'exact' }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('role', 'customer'),
    supabase.from('orders').select('total').eq('status', 'paid'),
    supabase
      .from('orders')
      .select('total')
      .eq('status', 'paid')
      .gte('created_at', monthStart),
    supabase.from('orders').select('id', { count: 'exact' }).eq('status', 'pending'),
  ]);

  const totalRevenue =
    paidOrdersResult.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
  const monthRevenue =
    monthOrdersResult.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

  const totalOrders = ordersResult.count || 0;
  const paidOrders =
    paidOrdersResult.data?.filter((o) => o.total !== undefined).length || 0;

  return {
    totalRevenue,
    monthRevenue,
    totalOrders,
    paidOrders,
    totalCustomers: customersResult.count || 0,
    totalProducts: productsResult.count || 0,
    pendingOrders: pendingOrdersResult.count || 0,
    averageOrderValue: paidOrders > 0 ? totalRevenue / paidOrders : 0,
  };
}

// Wishlist
export async function getUserWishlist(userId: string): Promise<Wishlist[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('wishlist')
    .select('*, product:products(*, category:categories(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];

  return (data || []) as Wishlist[];
}

export async function isInWishlist(
  userId: string,
  productId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('wishlist')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single();

  return !!data;
}
