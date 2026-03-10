import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

const resolvedAppUrl =
  process.env.SHOPIFY_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

const resolvedHostName = resolvedAppUrl.replace(/^https?:\/\//, "");

const resolvedScopes =
  process.env.SHOPIFY_SCOPES?.split(",").map((scope) => scope.trim()).filter(Boolean) || [
    "read_products",
    "write_products",
    "read_inventory",
    "write_inventory",
    "read_price_rules",
    "write_price_rules",
  ];

// Initialize Shopify API with configuration
export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  scopes: resolvedScopes,
  hostName: resolvedHostName,
  hostScheme: "https",
  apiVersion: ApiVersion.January24,
  isEmbeddedApp: true,
  isCustomStoreApp: false,
});

export const SHOPIFY_CONFIG = {
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecret: process.env.SHOPIFY_API_SECRET || "",
  appUrl: resolvedAppUrl,
  scopes: resolvedScopes,
};
