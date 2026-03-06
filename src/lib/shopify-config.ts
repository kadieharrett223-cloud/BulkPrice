import { shopifyApi, ApiVersion, LATEST_API_VERSION } from "@shopify/shopify-api";

// Initialize Shopify API with configuration
export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  scopes: [
    "read_products",
    "write_products",
    "read_inventory",
    "write_inventory",
    "read_price_rules",
    "write_price_rules",
  ],
  hostName: process.env.SHOPIFY_APP_URL?.replace(/https?:\/\//, "") || "",
  hostScheme: "https",
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  isCustomStoreApp: false,
});

export const SHOPIFY_CONFIG = {
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecret: process.env.SHOPIFY_API_SECRET || "",
  appUrl: process.env.SHOPIFY_APP_URL || "",
  scopes: [
    "read_products",
    "write_products",
    "read_inventory",
    "write_inventory",
    "read_price_rules",
    "write_price_rules",
  ],
};
