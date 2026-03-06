# Quick Start Guide

## 📋 Installation Steps (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database
```bash
npm run db:init
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open in Browser
Navigate to: **http://localhost:3000**

---

## 🔧 First-Time Setup

### Step 1: Configure Shopify API
1. Go to **Settings** page (⚙️ icon in navigation)
2. Enter your Shopify details:
   - **Shop URL**: yourstore.myshopify.com
   - **API Key**: From Shopify Admin
   - **API Password**: From Shopify Admin
3. Click **Test Connection** to verify
4. Select your plan (Basic/Pro/Advanced)
5. Click **Save Settings**

### Step 2: Get Shopify API Credentials
1. Log in to your Shopify Admin
2. Go to **Apps and integrations** → **Develop apps**
3. Click **Create an app**
4. Fill in app details and create
5. Go to **Configuration** tab
6. Copy **API key** and **Access token**
7. Paste into Settings page

---

## 🎯 Using the Bulk Price Editor

### Basic Workflow
```
1. Select Products (with filters)
    ↓
2. Choose Action (increase, decrease, set, round)
    ↓
3. Preview Changes (see all changes in table)
    ↓
4. Confirm (apply to store)
```

### Example: Increase Summer Collection by 10%

1. Click **Bulk Price Editor** in navigation
2. **Filter Step**: 
   - Enter "Summer Collection" in Collections field
   - Press Enter
3. **Action Step**:
   - Select "Increase by Percentage"
   - Enter: 10
4. **Preview Step**:
   - Review all 50 products
   - Download CSV if needed
5. **Confirm Step**:
   - Click "Apply to 50 Products"
6. **Success!** 
   - See the "Undo Changes" button to rollback if needed

---

## 📅 Scheduling a Sale

1. Click **Scheduled Changes** in navigation
2. Click **Schedule Change**
3. Fill in:
   - **Name**: "Black Friday Sale"
   - **Start Time**: Nov 24, 2024 12:00 AM
   - **End Time**: Nov 25, 2024 11:59 PM
   - **Auto Revert**: Enabled
4. Click **Create Schedule**
5. Prices will automatically change and revert!

---

## 🔄 Undoing Changes

### Immediate Undo (up to 30 days)
1. After applying changes, you'll see a yellow box
2. Click **Undo Changes** button
3. Prices are instantly restored!

### From History
1. Go to **History** page
2. View all past changes
3. Can manually rollback from Activity Log

---

## 📊 Key Metrics

The Dashboard shows:
- **Recent Activity** - Last 5 operations
- **Quick Stats** - Products, changes, savings
- **Feature Overview** - All available tools

---

## 🎨 Available Actions

| Action | Use Case | Example |
|--------|----------|---------|
| Increase by % | Raise all prices proportionally | +10% markup |
| Decrease by % | Volume discount | -15% off |
| Increase by $ | Add fixed cost | +$5 profit margin |
| Decrease by $ | Reduce specific amount | -$3 |
| Set Price | Set all same | All $29.99 |
| Round | Psychological pricing | Round to .99 |

---

## 🎯 Smart Filters

Combine multiple filters:
- **Collections**: Target specific product groups
- **Vendors**: Filter by supplier
- **Price Range**: Only products $50-$100
- **Product Types**: Specific categories
- **Tags**: By custom tags
- **Inventory**: Low stock items

---

## 📁 CSV Import/Export

### Export Prices
1. In Preview step, click **CSV** button
2. Save the file
3. Edit in Excel
4. Re-upload via import feature

### Import Prices
1. Prepare CSV with columns:
   - Product ID
   - New Price
   - (Optional) Compare At Price
2. Go to bulk editor
3. Upload CSV file
4. Preview and apply

---

## 📝 Activity Log

View all changes:
1. Navigate to **History** page
2. See all modifications with:
   - Date and time
   - Action performed
   - Number of products affected
3. Search by product or action
4. Pagination for large logs

---

## 💡 Pro Tips

✅ **Always preview** before applying changes
✅ **Use filters** to target specific products
✅ **Test on few products** first (5-10)
✅ **Schedule sales** ahead of time
✅ **Download CSV** for documentation
✅ **Check Activity Log** to verify changes

---

## ❌ Common Issues & Solutions

### "Connection Failed"
- ✓ Verify shop URL is correct (with .myshopify.com)
- ✓ Check API key and password
- ✓ Ensure API credentials have right permissions
- ✓ Try Test Connection button again

### "No products found"
- ✓ Check filters aren't too restrictive
- ✓ Remove all filters to see all products
- ✓ Verify product data in Shopify

### "Changes not applied"
- ✓ Check Activity Log for errors
- ✓ Verify Shopify API has write permissions
- ✓ Try with fewer products (5-10)

---

## 📞 Need Help?

1. Check **Settings** → Test Connection
2. Review **Activity Log** for error messages
3. Read **PROJECT_STRUCTURE.md** for technical details
4. See **README.md** for full documentation

---

## 🚀 Next Steps

- [ ] Configure Shopify API credentials
- [ ] Test with 5-10 products
- [ ] Make first price change
- [ ] Schedule a sale
- [ ] Review Activity History
- [ ] Explore CSV import/export

---

**Happy Price Editing! 🎉**
