# Setting Up Shopify OAuth Auto-Connection

Your app now has Shopify OAuth! Here's how customers will auto-connect:

## Customer Experience

1. **Customer clicks "Install App"** on Shopify App Store (or your install link)
2. **Shopify redirects to** `your-app.vercel.app/api/auth?shop=customer-store.myshopify.com`
3. **OAuth flow starts** - customer sees Shopify permission screen
4. **Customer clicks "Install"**
5. **App automatically connects** to their store
6. **Customer is redirected** to your app dashboard - ready to use!

## Setup Steps for You

### 1. Create Shopify App in Partner Dashboard

1. Go to https://partners.shopify.com
2. Click **Apps** → **Create app**
3. Choose **Custom app** or **Public app**
4. Fill in:
   - **App name**: Springify Bulk Price Editor
   - **App URL**: `https://your-app.vercel.app`
   - **Allowed redirection URL**: `https://your-app.vercel.app/api/auth/callback`

### 2. Get Your Credentials

From the Shopify Partner dashboard:
- Copy **API key** (Client ID)
- Copy **API secret key** (Client secret)

### 3. Add to Vercel Environment Variables

In your Vercel project settings → Environment Variables:

```env
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_SHOPIFY_API_KEY=your_api_key_here
```

### 4. Configure API Scopes

Your app requests these permissions:
- ✅ `read_products` - Read product data
- ✅ `write_products` - Update product prices
- ✅ `read_inventory` - Check stock levels
- ✅ `write_inventory` - Update inventory
- ✅ `read_price_rules` - Read discounts
- ✅ `write_price_rules` - Create discounts

### 5. Set Up Webhooks (Important!)

In Shopify Partner dashboard, add webhook:
- **Topic**: `app/uninstalled`
- **URL**: `https://your-app.vercel.app/api/webhooks/app-uninstalled`
- **API Version**: 2024-01

## Installation Flow

### For Testing (Development)
```
https://your-store.myshopify.com/admin/oauth/authorize?client_id=YOUR_API_KEY&scope=read_products,write_products,read_inventory,write_inventory,read_price_rules,write_price_rules&redirect_uri=https://your-app.vercel.app/api/auth/callback
```

### For Production (App Store)
Customers click "Install" → Shopify handles everything automatically!

## What Changed

**Before (Manual Setup):**
- Customer installs app
- Customer goes to Settings page
- Customer manually creates private app in Shopify
- Customer copies API key + password
- Customer pastes into your app
- 😞 Too complicated!

**After (OAuth Auto-Connect):**
- Customer clicks "Install"
- OAuth completes automatically
- Customer immediately uses app
- 😊 One-click install!

## Files Added

1. **src/lib/shopify-config.ts** - OAuth configuration
2. **src/lib/session-storage.ts** - Stores OAuth tokens securely
3. **src/pages/api/auth/index.ts** - Starts OAuth flow
4. **src/pages/api/auth/callback.ts** - Completes OAuth
5. **src/pages/api/webhooks/app-uninstalled.ts** - Cleanup when uninstalled
6. **src/components/ShopifyAppProvider.tsx** - App Bridge wrapper
7. **shopify.app.toml** - Shopify CLI configuration

## Next: Add Billing

Once OAuth is working, we can add subscription billing so customers automatically pay when they install!
