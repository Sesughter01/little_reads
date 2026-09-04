export type UserRole = 'customer' | 'admin';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  author: string;
  short_description: string;
  description: string;
  price: number;
  sale_price: number | null;
  cover_url: string | null;
  pdf_path: string | null;
  age_min: number;
  age_max: number;
  reading_level: string;
  page_count: number;
  reading_time: string;
  category_id: string;
  featured: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  average_rating?: number;
  review_count?: number;
}

export interface ProductWithDetails extends Product {
  category: Category;
  learning_outcomes: LearningOutcome[];
  keywords: ProductKeyword[];
  average_rating: number;
  review_count: number;
}

export interface LearningOutcome {
  id: string;
  product_id: string;
  outcome: string;
  sort_order: number;
}

export interface ProductKeyword {
  id: string;
  product_id: string;
  keyword: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  customer_email: string;
  customer_name: string;
  phone: string | null;
  subtotal: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paystack_reference: string | null;
  payment_channel: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  items?: OrderItem[];
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  title_snapshot: string;
  price_snapshot: number;
  created_at: string;
  // Joined
  product?: Product;
}

export interface Purchase {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string;
  purchased_at: string;
  // Joined
  product?: Product;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  verified_purchase: boolean;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
  // Joined
  user?: Profile;
  product?: Product;
}

export type ReviewStatus = 'pending' | 'approved' | 'hidden';

export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  // Joined
  product?: Product;
}

export interface CartItem {
  product: Product;
  quantity: 1; // Ebooks: only 1 per product
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  created_at: string;
}

// Paystack types
export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, unknown>;
    customer: {
      id: number;
      email: string;
      customer_code: string;
      first_name: string;
      last_name: string;
    };
  };
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Stats types
export interface DashboardStats {
  totalRevenue: number;
  monthRevenue: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
}

export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

export interface BookMetadata {
  id: string;
  title: string;
  slug: string;
  author: string;
  description: string;
  short_description: string;
  category: string;
  category_slug: string;
  age_min: number;
  age_max: number;
  reading_level: string;
  page_count: number;
  reading_time: string;
  price: number;
  learning_outcomes: string[];
  keywords: string[];
  featured: boolean;
  cover_path: string;
  pdf_path: string;
}
