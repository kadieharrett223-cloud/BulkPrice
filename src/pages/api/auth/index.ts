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

    // Detect embedded context BEFORE calling auth.begin().
    // auth.begin() immediately sends a 302 via rawResponse.redirect(), so if we call it
    // while inside an iframe the OAuth URL loads in the iframe — then accounts.shopify.com
    // refuses framing and the whole flow breaks.
    //
    // Two-step strategy:
    //   Step 1 (embedded): return a tiny HTML page that navigates window.top to
    //           /api/auth?shop=SHOP  (no host param → treated as top-level on arrival)
    //   Step 2 (top-level): call auth.begin() normally — it sends the 302 to Shopify OAuth.
    const isEmbedded =
      typeof req.query.host === "string" || req.query.embedded === "1";

    if (isEmbedded) {
      // We are inside the Shopify Admin iframe. Do NOT call auth.begin() here.
      // Just break out to the top window with a plain navigation. The top window
      // will hit /api/auth again, this time without `host`, and auth.begin() will
      // run normally in a full browser context where cookies work.
      const topAuthUrl = `/api/auth?shop=${encodeURIComponent(sanitizedShop)}`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-Frame-Options", "ALLOWALL");
      return res.send(`<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>Redirecting…</title></head>
  <body>
    <script>
      (function () {
        var url = ${JSON.stringify(topAuthUrl)};
        try {
          if (window.top && window.top !== window.self) {
            window.top.location.href = url;
          } else {
            window.location.href = url;
          }
        } catch (e) {
          window.location.href = url;
        }
      })();
    </script>
    <p>Redirecting to Shopify authorization…</p>
  </body>
</html>`);
    }

    // Not embedded — top-level browser context. auth.begin() sends the 302 itself.
    await shopify.auth.begin({
      shop: sanitizedShop,
      callbackPath: "/api/auth/callback",
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });
  } catch (error: any) {
    console.error("Error starting OAuth:", {
      message: error?.message,
      stack: error?.stack,
      shop: req.query?.shop,
    });
    return res.status(500).json({ error: `Failed to start OAuth flow: ${error?.message || "Unknown error"}` });
  }
}
