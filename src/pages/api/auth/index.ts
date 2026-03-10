import { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify-config";

function normalizeShop(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (!value) return null;
  const normalized = value.endsWith(".myshopify.com") ? value : `${value}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalized) ? normalized : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { shop } = req.query;

    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      console.error("Missing Shopify auth env vars", {
        hasApiKey: Boolean(process.env.SHOPIFY_API_KEY),
        hasApiSecret: Boolean(process.env.SHOPIFY_API_SECRET),
      });
      return res.status(500).json({ error: "OAuth not configured: missing SHOPIFY_API_KEY/SHOPIFY_API_SECRET" });
    }

    if (!process.env.SHOPIFY_APP_URL && !process.env.VERCEL_URL) {
      console.error("Missing Shopify app URL env var", {
        hasShopifyAppUrl: Boolean(process.env.SHOPIFY_APP_URL),
        hasVercelUrl: Boolean(process.env.VERCEL_URL),
      });
      return res.status(500).json({ error: "OAuth not configured: missing SHOPIFY_APP_URL" });
    }

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({ error: "Missing shop parameter" });
    }

    // Sanitize shop domain
    const sanitizedShop = normalizeShop(shop);
    
    if (!sanitizedShop) {
      return res.status(400).json({ error: "Invalid shop domain" });
    }

    // Start OAuth flow
    const callbackPath = "/api/auth/callback";
    const authRoute = await shopify.auth.begin({
      shop: sanitizedShop,
      callbackPath,
      isOnline: false, // Use offline tokens for long-term access
      rawRequest: req,
      rawResponse: res,
    });

    return res.redirect(authRoute);
  } catch (error: any) {
    console.error("Error starting OAuth:", {
      message: error?.message,
      stack: error?.stack,
      shop: req.query?.shop,
    });
    return res.status(500).json({ error: `Failed to start OAuth flow: ${error?.message || "Unknown error"}` });
  }
}
