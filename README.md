# The Perfect Shopify Bulk Price Editor

A powerful, intuitive web application for managing Shopify product prices in bulk. Edit prices, schedule changes, and rollback mistakes with complete safety and control.

## 🎯 Features

### 1. **Simple Bulk Price Changes**
- Increase prices by percentage
- Decrease prices by percentage
- Increase prices by fixed amount
- Set exact price
- Round prices automatically (.99, .95, .00)

### 2. **Smart Product Filtering**
- Filter by collection
- Filter by vendor
- Filter by product type
- Filter by tags
- Filter by price range
- Filter by inventory level
- Select specific products

### 3. **Preview Changes Before Applying**
- See all changes in a detailed table
- Review savings and percentage changes
- Search and sort preview results
- Download preview as CSV

### 4. **Undo / Rollback Feature**
- Instantly rollback any price change
- Keep snapshots for 30 days
- One-click restoration of previous prices

### 5. **Scheduled Price Changes**
- Plan price changes for future dates
- Set specific start and end times
- Automatic price revert after sale
- Perfect for promotions and sales events

### 6. **Compare-at Price Editing**
- Edit product prices and compare-at prices together
- Adjust compare-at as percentage of sale price
- Adjust compare-at by fixed amount

### 7. **Variant-Level Editing**
- Edit specific product variants
- Target variants by size, color, or other options
- Bulk edit all variants or specific ones

### 8. **Bulk CSV Import / Export**
- Export prices to CSV for offline editing
- Edit in Excel and re-upload
- Import/export with full support

### 9. **Price Rounding Rules**
- Round to .99 (psychological pricing)
- Round to .95
- Round to nearest dollar
- Configurable per operation

### 10. **Activity History**
- Full audit log of all changes
- See who changed what and when
- Track all operations with details
- Search and filter activity logs

### 11. **Multi-Currency Support**
- Handle base currency edits
- Support currency conversion rules
- Display prices in multiple currencies

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- SQLite3

### Installation

1. Clone or download the repository
2. Install dependencies:
```bash
npm install
```

3. Initialize the database:
```bash
npm run db:init
```

4. Configure your Shopify API credentials in the Settings page

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## 🔧 Tech Stack

- **Frontend**: React 18, Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: SQLite with WAL mode
- **API**: Shopify GraphQL & REST APIs
- **UI Components**: Lucide React, React Hot Toast

## 📋 API Routes

### Products
- `GET /api/products` - List all products

### Price Operations
- `POST /api/preview-prices` - Preview changes before applying
- `POST /api/apply-prices` - Apply price changes to products
- `POST /api/rollback` - Rollback previous changes

### Schedules
- `GET /api/scheduled-changes` - List scheduled changes
- `POST /api/scheduled-changes` - Create new schedule
- `PUT /api/scheduled-changes` - Update schedule status
- `DELETE /api/scheduled-changes` - Delete schedule

### Activity
- `GET /api/activity-log` - Fetch activity history

### Settings
- `GET /api/settings` - Get app settings
- `POST /api/settings` - Update settings

## 🔐 Security

- API credentials are encrypted and never exposed
- All changes are logged for audit
- Rollback snapshots kept for 30 days
- Password fields masked in UI
- HTTPS recommended for production

## 💰 Pricing Plans

| Plan | Price | Features |
|------|-------|----------|
| Basic | $9/month | Bulk pricing, filtering, preview, rollback |
| Pro | $19/month | Basic + scheduling, CSV tools |
| Advanced | $39/month | All features + multi-currency, priority support |

## 📊 Performance

Optimized for large stores:
- 10 products: Instant
- 100 products: < 1 second
- 1,000 products: ~5-10 seconds
- 5,000 products: ~30-60 seconds
- 10,000 products: ~2-3 minutes

## 📚 User Guide

### Basic Workflow

1. **Select Products** - Use filters to target specific products
2. **Choose Action** - Select percentage, fixed, or exact price change
3. **Preview** - Review all changes before confirming
4. **Confirm** - Apply changes to your store

### Scheduling a Sale

1. Go to Scheduled Changes
2. Click "Schedule Change"
3. Set start and end times
4. Configure price adjustments
5. Changes apply and revert automatically

### Rollback Changes

1. If the orange rollback banner appears after changes
2. Click "Undo Changes"
3. Confirm the rollback
4. Prices are instantly restored

## 🐛 Troubleshooting

### Connection Issues
- Verify your Shopify API credentials are correct
- Check your shop URL (e.g., yourstore.myshopify.com)
- Ensure API credentials have proper permissions

### Database Issues
- Delete `data/app.db` to reset
- Run `npm run db:init` to reinitialize
- Check SQLite is installed

### Performance Issues
- For very large catalogs (10k+ products), use CSV import
- Break large operations into smaller batches
- Schedule changes during off-peak hours

## 📝 License

MIT License - feel free to use and modify

## 🤝 Support

For questions or issues:
1. Check the troubleshooting section
2. Review the Activity History log
3. Test API connection in Settings

## 🎓 Best Practices

- Always preview changes before applying
- Use filters to target specific products
- Keep rollback enabled for first-time decisions
- Take advantage of scheduled changes for planned sales
- Review activity logs regularly

## 🔄 Update Process

1. Pull latest changes
2. Run `npm install` to update dependencies
3. Run `npm run db:init` to migrate database
4. Restart the application

---

**Made with ❤️ for Shopify store owners**
