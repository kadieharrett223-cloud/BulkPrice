# Deployment Instructions

## 🚀 Quick Deploy to Vercel

### 1. Push Code to GitHub (Already Done ✓)
Your code is at: `https://github.com/kadieharrett223-cloud/BulkPrice`

### 2. Create Shopify Partner App

1. Go to https://partners.shopify.com
2. Click **Apps** → **Create app** → **Create app manually**
3. Fill in:
   - **App name**: BulkPrice
   - **App URL**: `https://your-app.vercel.app` (you'll update this after Vercel deployment)
   - **Allowed redirection URLs**: 
     ```
     https://your-app.vercel.app/api/auth/callback
     ```
4. Copy your **Client ID** and **Client secret**

### 3. Create Supabase Postgres Database (Free Tier)

1. Go to https://supabase.com
2. Sign up with GitHub
3. Click **New project**
4. Open **Project Settings** → **Database**
5. Copy the **Connection String** (starts with `postgresql://`)

### 4. Deploy to Vercel

1. Go to https://vercel.com
2. Click **New Project**
3. Import `kadieharrett223-cloud/BulkPrice`
4. Add these **Environment Variables**:

```env
# Shopify OAuth (from Step 2)
SHOPIFY_API_KEY=your_client_id_from_shopify
SHOPIFY_API_SECRET=your_client_secret_from_shopify
SHOPIFY_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_SHOPIFY_API_KEY=your_client_id_from_shopify

# Database (from Step 3)
POSTGRES_URL=your_supabase_connection_string

# App Config
NODE_ENV=production
```

5. Click **Deploy**

### 5. Update Shopify App URLs

After Vercel deployment, you'll get a URL like `https://your-app.vercel.app`

Go back to Shopify Partner dashboard and update:
- **App URL**: `https://your-actual-vercel-url.vercel.app`
- **Allowed redirection URL**: `https://your-actual-vercel-url.vercel.app/api/auth/callback`

Also update environment variables in Vercel:
- Change `SHOPIFY_APP_URL` to your actual Vercel URL
- Redeploy (Vercel → Deployments → ⋯ menu → Redeploy)

### 6. Configure Shopify App Settings

In Shopify Partner dashboard:

**API Access Scopes:**
```
read_products
write_products
read_inventory
write_inventory
read_price_rules
write_price_rules
```

**Webhooks:**
- Topic: `app/uninstalled`
- URL: `https://your-app.vercel.app/api/webhooks/app-uninstalled`
- Format: JSON

### 7. Test Installation

Install on a development store:
```
https://your-dev-store.myshopify.com/admin/oauth/authorize?client_id=YOUR_CLIENT_ID&scope=read_products,write_products,read_inventory,write_inventory,read_price_rules,write_price_rules&redirect_uri=https://your-app.vercel.app/api/auth/callback
```

Or use the **Test on development store** button in Partner dashboard.

---

## 🎯 What Happens When a Customer Installs

1. **Customer clicks "Install App"**
2. **OAuth flow starts** - Shopify shows permission screen
3. **Customer approves** - App gets access token automatically
4. **Billing screen appears** - Customer chooses a plan
5. **Customer confirms subscription** - Shopify charges them monthly
6. **App is ready to use!**

### Billing Plans

Your app offers 2 plans:

**Basic Plan - $1.99/month**
- 7-day free trial
- Up to 1,000 products
- Basic filters, price history, rollback, CSV import/export

**Pro Plan - $5/month** (Recommended)
- 7-day free trial
- Unlimited products
- Advanced filters, scheduled changes, flash sales, bulk variant editing

---

## 🛠️ Architecture

### Database
- **Local Development**: SQLite (automatic)
- **Production (Vercel)**: Supabase Postgres (serverless)
- Unified interface - code works in both environments

### Authentication
- **OAuth 2.0**: Automatic connection to customer stores
- **App Bridge**: Embedded in Shopify admin
- **Session storage**: Secure token management

### Billing
- **Shopify Billing API**: Native subscription handling
- **Automatic trials**: 7 days free
- **Test mode**: Free during development

---

## 📝 Next Steps

After deployment:
1. ✅ Test installation on development store
2. ✅ Verify billing flow works
3. ✅ Submit app for review (if making it public)
4. ✅ Configure pricing in Shopify Partner dashboard
5. ✅ Add app listing details

---

## 🐛 Troubleshooting

**"Database not initialized"**
- Make sure `POSTGRES_URL` is set in Vercel
- Check Supabase database is accessible

**"OAuth error"**
- Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
- Check redirect URL matches exactly in Shopify settings

**"Billing failed"**
- Ensure you're using a development store for testing
- Test mode is automatic in non-production environments

---

## 📚 Documentation

- [Shopify App Development](https://shopify.dev/docs/apps)
- [Supabase Postgres](https://supabase.com/docs/guides/database)
- [Vercel Deployment](https://vercel.com/docs)
