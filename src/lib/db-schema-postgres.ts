// PostgreSQL schema for production (Neon)
export const PG_SCHEMA = `
-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  shopify_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  vendor TEXT,
  product_type TEXT,
  status TEXT DEFAULT 'active',
  tags TEXT,
  collections TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product variants
CREATE TABLE IF NOT EXISTS variants (
  id TEXT PRIMARY KEY,
  shopify_id TEXT UNIQUE NOT NULL,
  product_id TEXT NOT NULL,
  title TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  sku TEXT,
  inventory INTEGER DEFAULT 0,
  options TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Price change history
CREATE TABLE IF NOT EXISTS price_history (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  old_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL,
  old_compare_at_price DECIMAL(10,2),
  new_compare_at_price DECIMAL(10,2),
  change_type TEXT NOT NULL,
  percentage DECIMAL(10,2),
  fixed_amount DECIMAL(10,2),
  change_group_id TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (variant_id) REFERENCES variants(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Scheduled price changes
CREATE TABLE IF NOT EXISTS scheduled_changes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  filters TEXT NOT NULL,
  action TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  auto_revert BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled change items
CREATE TABLE IF NOT EXISTS scheduled_change_items (
  id TEXT PRIMARY KEY,
  change_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  old_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL,
  old_compare_at_price DECIMAL(10,2),
  new_compare_at_price DECIMAL(10,2),
  applied BOOLEAN DEFAULT false,
  reverted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (change_id) REFERENCES scheduled_changes(id),
  FOREIGN KEY (variant_id) REFERENCES variants(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  description TEXT,
  details TEXT,
  affected_count INTEGER DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rollback snapshots
CREATE TABLE IF NOT EXISTS rollback_snapshots (
  id TEXT PRIMARY KEY,
  change_group_id TEXT NOT NULL,
  variant_data TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- App settings
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  shop TEXT,
  api_key TEXT,
  api_password TEXT,
  plan TEXT DEFAULT 'basic',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions for OAuth
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  state TEXT,
  is_online BOOLEAN DEFAULT false,
  scope TEXT,
  expires BIGINT,
  access_token TEXT,
  online_access_info TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products(shopify_id);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_shopify_id ON variants(shopify_id);
CREATE INDEX IF NOT EXISTS idx_price_history_variant_id ON price_history(variant_id);
CREATE INDEX IF NOT EXISTS idx_price_history_change_group ON price_history(change_group_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_changes_status ON scheduled_changes(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_change_items_change_id ON scheduled_change_items(change_id);
CREATE INDEX IF NOT EXISTS idx_sessions_shop ON sessions(shop);
`;
