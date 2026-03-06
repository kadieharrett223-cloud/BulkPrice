// Product and Variant types
export interface Product {
  id: string;
  shopifyId: string;
  title: string;
  vendor?: string;
  productType?: string;
  status?: "active" | "draft" | "archived";
  tags?: string[];
  collections?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Variant {
  id: string;
  shopifyId: string;
  productId: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  sku?: string;
  inventory: number;
  options?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithVariants extends Product {
  variants: Variant[];
}

// Price change types
export interface PriceChange {
  id: string;
  variantId: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  oldCompareAtPrice?: number;
  newCompareAtPrice?: number;
  changeType: "percentage" | "fixed" | "exact" | "compareAt";
  percentage?: number;
  fixedAmount?: number;
  changeGroupId: string;
  timestamp: string;
}

export interface PricePreview {
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  oldPrice: number;
  newPrice: number;
  oldCompareAtPrice?: number;
  newCompareAtPrice?: number;
  change: number; // percentage or fixed
  savings?: number;
  wasProtected?: boolean;
  protectionFloor?: number;
}

// Filter types
export interface PriceFilter {
  collections?: string[];
  vendors?: string[];
  productTypes?: string[];
  statuses?: Array<"active" | "draft" | "archived">;
  tags?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  inventoryRange?: {
    min: number;
    max: number;
  };
  specificProducts?: string[];
  variantOptions?: Record<string, string[]>;
}

// Action types
export interface PriceAction {
  type: "percentage_increase" | "percentage_decrease" | "fixed_increase" | "fixed_decrease" | "exact" | "round";
  value?: number;
  roundTo?: ".99" | ".95" | ".00";
  includeCompareAt?: boolean;
  compareAtAdjustment?: {
    type: "percentage" | "fixed";
    value: number;
  };
  marginProtection?: {
    enabled: boolean;
    mode: "fixed_minimum" | "cost_plus_percentage" | "cost_plus_fixed";
    value: number;
  };
}

// Scheduled change
export interface ScheduledChange {
  id: string;
  name: string;
  description?: string;
  filters: PriceFilter;
  action: PriceAction;
  startTime: string;
  endTime?: string;
  autoRevert: boolean;
  status: "scheduled" | "active" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

// Activity log
export interface ActivityLog {
  id: string;
  action: string;
  details?: string;
  affectedCount: number;
  changeGroupId?: string;
  timestamp: string;
  userId?: string;
}

// Settings
export interface AppSettings {
  apiKey: string;
  apiPassword: string;
  shop: string;
  plan: "basic" | "pro" | "advanced";
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PriceChangeResponse {
  changeGroupId: string;
  affectedCount: number;
  preview: PricePreview[];
  estimatedTime?: number;
}

export interface RollbackResponse {
  success: boolean;
  affectedCount: number;
  timestamp: string;
}

// Shopify API types
export interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  compare_at_price?: string;
  sku?: string;
  inventory_quantity?: number;
  option1?: string;
  option2?: string;
  option3?: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  variants: ShopifyVariant[];
  created_at: string;
  updated_at: string;
}
