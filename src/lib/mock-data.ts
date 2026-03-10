/**
 * Mock data for demo mode.
 * When no real Shopify session is present (e.g. previewing on Vercel),
 * all API routes fall back to this data.  Once a store owner installs
 * the app via OAuth they get their own real Shopify data.
 */

export const DEMO_SHOP = "demo.myshopify.com";

/** Returns true if the given shop identifier is the demo/preview shop */
export function isDemoShop(shop: string | undefined | null): boolean {
  if (!shop) return false;
  return shop === DEMO_SHOP;
}

// ─── Mock Products ────────────────────────────────────────────────────────────

export interface MockVariant {
  id: string;
  shopifyId: string;
  productId: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  sku: string;
  inventory: number;
  cost: number | null;
  shop: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockProduct {
  id: string;
  shopifyId: string;
  title: string;
  vendor: string;
  productType: string;
  status: "active" | "draft" | "archived";
  tags: string;
  collections: string;
  shop: string;
  createdAt: string;
  updatedAt: string;
  variantCount: number;
}

const NOW = new Date().toISOString();

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: "mock-prod-1",
    shopifyId: "8001",
    title: "Classic Crew-Neck Tee",
    vendor: "Urban Thread",
    productType: "Apparel",
    status: "active",
    tags: "cotton,basics,summer",
    collections: "Summer Sale,Basics",
    shop: DEMO_SHOP,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: NOW,
    variantCount: 3,
  },
  {
    id: "mock-prod-2",
    shopifyId: "8002",
    title: "Slim-Fit Chino Pants",
    vendor: "Urban Thread",
    productType: "Apparel",
    status: "active",
    tags: "pants,casual,men",
    collections: "Men's Clothing",
    shop: DEMO_SHOP,
    createdAt: "2024-02-10T10:00:00Z",
    updatedAt: NOW,
    variantCount: 4,
  },
  {
    id: "mock-prod-3",
    shopifyId: "8003",
    title: "Leather Crossbody Bag",
    vendor: "Luxe Goods",
    productType: "Accessories",
    status: "active",
    tags: "leather,bag,accessories",
    collections: "Accessories,New Arrivals",
    shop: DEMO_SHOP,
    createdAt: "2024-03-05T10:00:00Z",
    updatedAt: NOW,
    variantCount: 2,
  },
  {
    id: "mock-prod-4",
    shopifyId: "8004",
    title: "Wireless Noise-Cancelling Headphones",
    vendor: "SoundWave",
    productType: "Electronics",
    status: "active",
    tags: "electronics,audio,wireless",
    collections: "Electronics,Best Sellers",
    shop: DEMO_SHOP,
    createdAt: "2024-03-20T10:00:00Z",
    updatedAt: NOW,
    variantCount: 2,
  },
  {
    id: "mock-prod-5",
    shopifyId: "8005",
    title: "Yoga Mat Pro",
    vendor: "FitLife",
    productType: "Sports & Fitness",
    status: "active",
    tags: "yoga,fitness,sports",
    collections: "Fitness,Best Sellers",
    shop: DEMO_SHOP,
    createdAt: "2024-04-01T10:00:00Z",
    updatedAt: NOW,
    variantCount: 2,
  },
  {
    id: "mock-prod-6",
    shopifyId: "8006",
    title: "Stainless Steel Water Bottle",
    vendor: "EcoSip",
    productType: "Kitchen",
    status: "active",
    tags: "eco,kitchen,hydration",
    collections: "Eco-Friendly,Kitchen",
    shop: DEMO_SHOP,
    createdAt: "2024-04-10T10:00:00Z",
    updatedAt: NOW,
    variantCount: 3,
  },
  {
    id: "mock-prod-7",
    shopifyId: "8007",
    title: "Merino Wool Beanie",
    vendor: "Urban Thread",
    productType: "Apparel",
    status: "active",
    tags: "wool,winter,accessories",
    collections: "Winter Collection,Accessories",
    shop: DEMO_SHOP,
    createdAt: "2024-05-01T10:00:00Z",
    updatedAt: NOW,
    variantCount: 2,
  },
  {
    id: "mock-prod-8",
    shopifyId: "8008",
    title: "Portable Phone Charger 20000mAh",
    vendor: "SoundWave",
    productType: "Electronics",
    status: "draft",
    tags: "electronics,charger,portable",
    collections: "Electronics",
    shop: DEMO_SHOP,
    createdAt: "2024-05-15T10:00:00Z",
    updatedAt: NOW,
    variantCount: 1,
  },
];

export const MOCK_VARIANTS: MockVariant[] = [
  // Classic Crew-Neck Tee
  { id: "mock-var-1a", shopifyId: "90001", productId: "mock-prod-1", title: "S / White", price: 29.99, compareAtPrice: 39.99, sku: "TEE-S-WHT", inventory: 45, cost: 12.0, shop: DEMO_SHOP, createdAt: "2024-01-15T10:00:00Z", updatedAt: NOW },
  { id: "mock-var-1b", shopifyId: "90002", productId: "mock-prod-1", title: "M / White", price: 29.99, compareAtPrice: 39.99, sku: "TEE-M-WHT", inventory: 120, cost: 12.0, shop: DEMO_SHOP, createdAt: "2024-01-15T10:00:00Z", updatedAt: NOW },
  { id: "mock-var-1c", shopifyId: "90003", productId: "mock-prod-1", title: "L / White", price: 29.99, compareAtPrice: null, sku: "TEE-L-WHT", inventory: 30, cost: 12.0, shop: DEMO_SHOP, createdAt: "2024-01-15T10:00:00Z", updatedAt: NOW },

  // Slim-Fit Chino Pants
  { id: "mock-var-2a", shopifyId: "90004", productId: "mock-prod-2", title: "30x30 / Khaki", price: 69.99, compareAtPrice: 89.99, sku: "CHINO-30-KHK", inventory: 20, cost: 28.0, shop: DEMO_SHOP, createdAt: "2024-02-10T10:00:00Z", updatedAt: NOW },
  { id: "mock-var-2b", shopifyId: "90005", productId: "mock-prod-2", title: "32x30 / Khaki", price: 69.99, compareAtPrice: 89.99, sku: "CHINO-32-KHK", inventory: 15, cost: 28.0, shop: DEMO_SHOP, createdAt: "2024-02-10T10:00:00Z", updatedAt: NOW },
  { id: "mock-var-2c", shopifyId: "90006", productId: "mock-prod-2", title: "34x30 / Navy", price: 74.99, compareAtPrice: null, sku: "CHINO-34-NVY", inventory: 10, cost: 30.0, shop: DEMO_SHOP, createdAt: "2024-02-10T10:00:00Z", updatedAt: NOW },
  { id: "mock-var-2d", shopifyId: "90007", productId: "mock-prod-2", title: "36x32 / Navy", price: 74.99, compareAtPrice: null, sku: "CHINO-36-NVY", inventory: 8, cost: 30.0, shop: DEMO_SHOP, createdAt: "2024-02-10T10:00:00Z", updatedAt: NOW },

  // Leather Crossbody Bag
  { id: "mock-var-3a", shopifyId: "90008", productId: "mock-prod-3", title: "Brown", price: 149.99, compareAtPrice: 199.99, sku: "BAG-BRN", inventory: 12, cost: 55.0, shop: DEMO_SHOP, createdAt: "2024-03-05T10:00:00Z", updatedAt: NOW },
  { id: "mock-var-3b", shopifyId: "90009", productId: "mock-prod-3", title: "Black", price: 149.99, compareAtPrice: 199.99, sku: "BAG-BLK", inventory: 18, cost: 55.0, shop: DEMO_SHOP, createdAt: "2024-03-05T10:00:00Z", updatedAt: NOW },

  // Wireless Headphones
  { id: "mock-var-4a", shopifyId: "90010", productId: "mock-prod-4", title: "Black", price: 199.99, compareAtPrice: 249.99, sku: "HP-BLK", inventory: 35, cost: 80.0, shop: DEMO_SHOP, createdAt: "2024-03-20T10:00:00Z", updatedAt: NOW },
  { id: "mock-var-4b", shopifyId: "90011", productId: "mock-prod-4", title: "Silver", price: 199.99, compareAtPrice: null, sku: "HP-SLV", inventory: 20, cost: 80.0, shop: DEMO_SHOP, createdAt: "2024-03-20T10:00:00Z", updatedAt: NOW },

  // Yoga Mat Pro
  { id: "mock-var-5a", shopifyId: "90012", productId: "mock-prod-5", title: "Purple", price: 59.99, compareAtPrice: 79.99, sku: "YM-PRP", inventory: 60, cost: 20.0, shop: DEMO_SHOP, createdAt: "2024-04-01T10:00:00Z", updatedAt: NOW },
  { id: "mock-var-5b", shopifyId: "90013", productId: "mock-prod-5", title: "Teal", price: 59.99, compareAtPrice: 79.99, sku: "YM-TEL", inventory: 55, cost: 20.0, shop: DEMO_SHOP, createdAt: "2024-04-01T10:00:00Z", updatedAt: NOW },

  // Water Bottle
  { id: "mock-var-6a", shopifyId: "90014", productId: "mock-prod-6", title: "500ml / Matte Black", price: 34.99, compareAtPrice: null, sku: "WB-500-BLK", inventory: 200, cost: 10.0, shop: DEMO_SHOP, createdAt: "2024-04-10T10:00:00Z", updatedAt: NOW },
  { id: "mock-var-6b", shopifyId: "90015", productId: "mock-prod-6", title: "750ml / Matte Black", price: 39.99, compareAtPrice: null, sku: "WB-750-BLK", inventory: 180, cost: 12.0, shop: DEMO_SHOP, createdAt: "2024-04-10T10:00:00Z", updatedAt: NOW },
  { id: "mock-var-6c", shopifyId: "90016", productId: "mock-prod-6", title: "750ml / Forest Green", price: 39.99, compareAtPrice: null, sku: "WB-750-GRN", inventory: 90, cost: 12.0, shop: DEMO_SHOP, createdAt: "2024-04-10T10:00:00Z", updatedAt: NOW },

  // Merino Beanie
  { id: "mock-var-7a", shopifyId: "90017", productId: "mock-prod-7", title: "Cream", price: 24.99, compareAtPrice: null, sku: "BEAN-CRM", inventory: 75, cost: 9.0, shop: DEMO_SHOP, createdAt: "2024-05-01T10:00:00Z", updatedAt: NOW },
  { id: "mock-var-7b", shopifyId: "90018", productId: "mock-prod-7", title: "Charcoal", price: 24.99, compareAtPrice: null, sku: "BEAN-CHR", inventory: 80, cost: 9.0, shop: DEMO_SHOP, createdAt: "2024-05-01T10:00:00Z", updatedAt: NOW },

  // Portable Charger
  { id: "mock-var-8a", shopifyId: "90019", productId: "mock-prod-8", title: "Default Title", price: 49.99, compareAtPrice: 69.99, sku: "PC-20K", inventory: 0, cost: 18.0, shop: DEMO_SHOP, createdAt: "2024-05-15T10:00:00Z", updatedAt: NOW },
];

// ─── In-memory mutable state (resets on cold start, persists within a session) ─

// We keep a mutable copy so that "apply prices" actually updates the numbers
// visible in subsequent preview/product calls during the same demo session.
let _variants = MOCK_VARIANTS.map((v) => ({ ...v }));

export function getMockVariants(): MockVariant[] {
  return _variants;
}

export function getMockProducts(): MockProduct[] {
  return MOCK_PRODUCTS.map((p) => ({
    ...p,
    variantCount: _variants.filter((v) => v.productId === p.id).length,
  }));
}

function getDistinctMockValues(field: "collections" | "vendor" | "productType"): string[] {
  const products = getMockProducts();

  if (field === "collections") {
    return Array.from(
      new Set(
        products
          .flatMap((product) => product.collections.split(","))
          .map((value) => value.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }

  return Array.from(
    new Set(
      products
        .map((product) => product[field])
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));
}

export function getMockCollectionOptions(): string[] {
  return getDistinctMockValues("collections");
}

export function getMockVendorOptions(): string[] {
  return getDistinctMockValues("vendor");
}

export function getMockProductTypeOptions(): string[] {
  return getDistinctMockValues("productType");
}

/** Apply a price update to the in-memory mock variants (returns updated count) */
export function applyMockPriceUpdate(
  variantId: string,
  newPrice: number,
  newCompareAtPrice: number | null | undefined
): boolean {
  const idx = _variants.findIndex((v) => v.id === variantId);
  if (idx === -1) return false;
  _variants[idx] = {
    ..._variants[idx],
    price: newPrice,
    compareAtPrice: newCompareAtPrice ?? _variants[idx].compareAtPrice,
    updatedAt: new Date().toISOString(),
  };
  return true;
}

/** Reset the in-memory variants back to the original mock data */
export function resetMockData(): void {
  _variants = MOCK_VARIANTS.map((v) => ({ ...v }));
}

// ─── Mock Activity Log ────────────────────────────────────────────────────────

export const MOCK_ACTIVITY_LOG = [
  {
    id: "mock-log-1",
    shop: DEMO_SHOP,
    action: "Applied percentage_increase to variants",
    affectedCount: 12,
    changeGroupId: "mock-group-1",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-log-2",
    shop: DEMO_SHOP,
    action: "Applied percentage_decrease to variants",
    affectedCount: 5,
    changeGroupId: "mock-group-2",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-log-3",
    shop: DEMO_SHOP,
    action: "Applied fixed_increase to variants",
    affectedCount: 8,
    changeGroupId: "mock-group-3",
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Mock Scheduled Changes ───────────────────────────────────────────────────

export const MOCK_SCHEDULED_CHANGES = [
  {
    id: "mock-sched-1",
    shop: DEMO_SHOP,
    name: "Spring Sale Launch",
    description: "20% off all Apparel (Spring Sale)",
    filters: JSON.stringify({ productTypes: ["Apparel"] }),
    action: JSON.stringify({ type: "percentage_decrease", value: 20, targetField: "compare_at" }),
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    autoRevert: true,
    status: "scheduled",
    createdAt: NOW,
  },
  {
    id: "mock-sched-2",
    shop: DEMO_SHOP,
    name: "Electronics Flash Sale",
    description: "15% off all Electronics for 48 hours",
    filters: JSON.stringify({ productTypes: ["Electronics"] }),
    action: JSON.stringify({ type: "percentage_decrease", value: 15, targetField: "base" }),
    startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    autoRevert: true,
    status: "scheduled",
    createdAt: NOW,
  },
];

// ─── In-memory log accumulator for demo apply-prices ─────────────────────────

interface DemoLogEntry {
  id: string;
  shop: string;
  action: string;
  affectedCount: number;
  changeGroupId: string;
  timestamp: string;
}

const _demoLog: DemoLogEntry[] = [...MOCK_ACTIVITY_LOG];

export function addDemoLogEntry(entry: DemoLogEntry): void {
  _demoLog.unshift(entry);
}

export function getDemoLog(limit = 50, offset = 0): DemoLogEntry[] {
  return _demoLog.slice(offset, offset + limit);
}

interface DemoRollbackSnapshotItem {
  variantId: string;
  shopifyId: string;
  price: number;
  compareAtPrice: number | null;
}

const _demoRollbackSnapshots = new Map<string, DemoRollbackSnapshotItem[]>();

export function saveDemoRollbackSnapshot(
  changeGroupId: string,
  snapshot: DemoRollbackSnapshotItem[]
): void {
  _demoRollbackSnapshots.set(changeGroupId, snapshot.map((item) => ({ ...item })));
}

export function getDemoRollbackSnapshot(changeGroupId: string): DemoRollbackSnapshotItem[] | undefined {
  const snapshot = _demoRollbackSnapshots.get(changeGroupId);
  return snapshot?.map((item) => ({ ...item }));
}

export function clearDemoRollbackSnapshot(changeGroupId: string): void {
  _demoRollbackSnapshots.delete(changeGroupId);
}

export function restoreMockVariants(
  snapshot: DemoRollbackSnapshotItem[]
): void {
  for (const item of snapshot) {
    applyMockPriceUpdate(item.variantId, item.price, item.compareAtPrice);
  }
}
