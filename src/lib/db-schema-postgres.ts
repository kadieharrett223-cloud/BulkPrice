// PostgreSQL schema for production (Supabase/Postgres)
export const PG_SCHEMA = `
-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  shop TEXT,
  shopifyId TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  vendor TEXT,
  productType TEXT,
  status TEXT DEFAULT 'active',
  tags TEXT,
  collections TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product variants
CREATE TABLE IF NOT EXISTS variants (
  id TEXT PRIMARY KEY,
  shop TEXT,
  shopifyId TEXT UNIQUE NOT NULL,
  productId TEXT NOT NULL,
  title TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  compareAtPrice DECIMAL(10,2),
  sku TEXT,
  inventory INTEGER DEFAULT 0,
  options TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id)
);

-- Price change history
CREATE TABLE IF NOT EXISTS priceHistory (
  id TEXT PRIMARY KEY,
  shop TEXT,
  variantId TEXT NOT NULL,
  productId TEXT NOT NULL,
  oldPrice DECIMAL(10,2) NOT NULL,
  newPrice DECIMAL(10,2) NOT NULL,
  oldCompareAtPrice DECIMAL(10,2),
  newCompareAtPrice DECIMAL(10,2),
  changeType TEXT NOT NULL,
  percentage DECIMAL(10,2),
  fixedAmount DECIMAL(10,2),
  changeGroupId TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (variantId) REFERENCES variants(id),
  FOREIGN KEY (productId) REFERENCES products(id)
);

-- Scheduled price changes
CREATE TABLE IF NOT EXISTS scheduledChanges (
  id TEXT PRIMARY KEY,
  shop TEXT,
  name TEXT NOT NULL,
  description TEXT,
  filters TEXT NOT NULL,
  action TEXT NOT NULL,
  startTime TIMESTAMP NOT NULL,
  endTime TIMESTAMP,
  autoRevert BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'scheduled',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled change items
CREATE TABLE IF NOT EXISTS scheduledChangeItems (
  id TEXT PRIMARY KEY,
  shop TEXT,
  scheduledChangeId TEXT NOT NULL,
  variantId TEXT NOT NULL,
  originalPrice DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (scheduledChangeId) REFERENCES scheduledChanges(id),
  FOREIGN KEY (variantId) REFERENCES variants(id)
);

-- Activity log
CREATE TABLE IF NOT EXISTS activityLog (
  id TEXT PRIMARY KEY,
  shop TEXT,
  action TEXT NOT NULL,
  details TEXT,
  affectedCount INTEGER,
  changeGroupId TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  userId TEXT
);

-- Rollback snapshots
CREATE TABLE IF NOT EXISTS rollbackSnapshots (
  id TEXT PRIMARY KEY,
  shop TEXT,
  changeGroupId TEXT UNIQUE NOT NULL,
  variantSnapshots TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiresAt TIMESTAMP
);

-- Currency settings
CREATE TABLE IF NOT EXISTS currencySettings (
  baseCurrency TEXT PRIMARY KEY,
  currencyRates TEXT,
  lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- App settings
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  apiKey TEXT,
  apiPassword TEXT,
  shop TEXT,
  plan TEXT DEFAULT 'basic',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions for OAuth
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  state TEXT,
  isOnline BOOLEAN DEFAULT false,
  scope TEXT,
  expires BIGINT,
  accessToken TEXT,
  onlineAccessInfo TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_shopId ON products(shopifyId);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop);
CREATE INDEX IF NOT EXISTS idx_variants_productId ON variants(productId);
CREATE INDEX IF NOT EXISTS idx_variants_shopId ON variants(shopifyId);
CREATE INDEX IF NOT EXISTS idx_variants_shop ON variants(shop);
CREATE INDEX IF NOT EXISTS idx_priceHistory_variantId ON priceHistory(variantId);
CREATE INDEX IF NOT EXISTS idx_priceHistory_changeGroupId ON priceHistory(changeGroupId);
CREATE INDEX IF NOT EXISTS idx_priceHistory_shop ON priceHistory(shop);
CREATE INDEX IF NOT EXISTS idx_activityLog_timestamp ON activityLog(timestamp);
CREATE INDEX IF NOT EXISTS idx_activityLog_shop ON activityLog(shop);
CREATE INDEX IF NOT EXISTS idx_scheduledChanges_status ON scheduledChanges(status);
CREATE INDEX IF NOT EXISTS idx_scheduledChanges_shop ON scheduledChanges(shop);
CREATE INDEX IF NOT EXISTS idx_sessions_shop ON sessions(shop);
`;
