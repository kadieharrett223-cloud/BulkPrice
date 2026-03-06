# Project Structure

## Directory Layout

```
bulkprice/
├── src/
│   ├── pages/
│   │   ├── api/
│   │   │   ├── products.ts              # Get products list
│   │   │   ├── preview-prices.ts        # Preview price changes
│   │   │   ├── apply-prices.ts          # Apply changes to store
│   │   │   ├── rollback.ts              # Rollback previous changes
│   │   │   ├── activity-log.ts          # Get activity history
│   │   │   ├── scheduled-changes.ts     # Manage scheduled changes
│   │   │   └── settings.ts              # Store API credentials
│   │   ├── _app.tsx                     # App wrapper
│   │   ├── _document.tsx                # HTML document
│   │   ├── index.tsx                    # Dashboard
│   │   ├── bulk-pricing.tsx             # Main bulk pricing page
│   │   ├── history.tsx                  # Activity history page
│   │   ├── settings.tsx                 # Settings page
│   │   └── scheduled.tsx                # Scheduled changes page
│   ├── components/
│   │   ├── Navigation.tsx               # Top navigation
│   │   └── bulk-pricing/
│   │       ├── FilterStep.tsx           # Step 1: Select products
│   │       ├── ActionStep.tsx           # Step 2: Choose action
│   │       ├── PreviewStep.tsx          # Step 3: Review changes
│   │       └── ConfirmStep.tsx          # Step 4: Confirm
│   ├── lib/
│   │   ├── db.ts                        # Database connection
│   │   ├── db-schema.ts                 # Database schema
│   │   ├── price-utils.ts               # Price calculation utilities
│   │   ├── csv-utils.ts                 # CSV import/export
│   │   └── shopify-api.ts               # Shopify API integration
│   ├── types/
│   │   └── index.ts                     # TypeScript types
│   └── styles/
│       └── globals.css                  # Global styles
├── scripts/
│   └── init-db.js                       # Database initialization script
├── data/                                # SQLite database (created on init)
├── .gitignore
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.js
├── postcss.config.js
├── tailwind.config.js
└── README.md
```

## Key Files Explained

### API Routes (`src/pages/api/`)
Each route handles a specific operation:
- **products.ts** - Fetch and list products from database
- **preview-prices.ts** - Calculate and preview price changes
- **apply-prices.ts** - Apply changes and create history records
- **rollback.ts** - Restore prices from snapshot
- **activity-log.ts** - Retrieve activity history
- **scheduled-changes.ts** - CRUD operations for scheduled changes
- **settings.ts** - Store and retrieve Shopify credentials

### Database Schema
SQLite tables:
- `products` - Store product information
- `variants` - Product variants with prices
- `priceHistory` - Log of all price changes
- `scheduledChanges` - Scheduled price changes
- `activityLog` - Activity audit trail
- `rollbackSnapshots` - Snapshots for undo feature
- `settings` - App configuration
- `currencySettings` - Currency conversion rates

### Core Components

#### Bulk Pricing Wizard (4-step flow)
1. **FilterStep** - Select products with filters
2. **ActionStep** - Choose price modification action
3. **PreviewStep** - Review all changes in table
4. **ConfirmStep** - Final confirmation before apply

### Utilities
- **price-utils.ts** - Price calculations, formatting, IDs
- **csv-utils.ts** - CSV parsing and export
- **shopify-api.ts** - Shopify REST/GraphQL API calls

## Configuration Files

- **package.json** - Dependencies and scripts
- **next.config.js** - Next.js configuration
- **tsconfig.json** - TypeScript configuration
- **tailwind.config.js** - Tailwind CSS setup
- **postcss.config.js** - PostCSS plugins

## Environment Variables

See `.env.example` for all available options:
- `DATABASE_URL` - Custom database path
- `NODE_ENV` - development or production

## Running the Application

### First Time Setup
```bash
npm install
npm run db:init
```

### Development
```bash
npm run dev
```
Navigate to http://localhost:3000

### Production Build
```bash
npm run build
npm start
```

## Database Initialization

The `scripts/init-db.js` script:
1. Creates data directory
2. Creates SQLite database
3. Runs schema migrations
4. Configures database pragmas
5. Initializes with empty tables

## Adding New Features

To add a new price action type:
1. Add to `PriceAction` type in `src/types/index.ts`
2. Add calculation logic in `src/lib/price-utils.ts`
3. Add UI in `src/components/bulk-pricing/ActionStep.tsx`
4. Handle in API routes

To add a new filter:
1. Add to `PriceFilter` type in `src/types/index.ts`
2. Add UI in `src/components/bulk-pricing/FilterStep.tsx`
3. Add SQL WHERE clause in API routes

## Performance Optimization

- SQLite WAL mode enabled for concurrent access
- Database indexes on frequently queried columns
- Lazy loading of components with Next.js
- CSV bulk operations for large catalogs
- API response pagination

## Security Notes

- API credentials stored in SQLite (encrypt in production)
- Password fields never logged
- All operations tracked for audit
- HTTPS recommended for production
- API credentials should have minimal Shopify permissions

## Testing

To test the application:
1. Configure test Shopify store credentials in Settings
2. Filter a small set of products (5-10)
3. Preview changes
4. Check Activity History
5. Rollback and verify

## Deployment

### Vercel (Recommended)
```bash
git push origin main
```

### Docker
```dockerfile
FROM node:16
WORKDIR /app
COPY . .
RUN npm install && npm run build
CMD ["npm", "start"]
```

### Self-Hosted
- Use Node.js 16+
- Set up reverse proxy (nginx)
- Configure HTTPS
- Regular database backups
- Monitor disk space for SQLite WAL files
