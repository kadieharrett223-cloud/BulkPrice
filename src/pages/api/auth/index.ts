import { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify-config";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY ?? "";

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

    const callbackPath = "/api/auth/callback";

    // auth.begin() sets the state cookie on res and returns the Shopify OAuth URL.
    // It does NOT send the HTTP body/redirect itself, so we can branch on embedded vs top.
    // Pass a no-op fake response so auth.begin() only sets the Set-Cookie header;
    // we will send the actual response ourselves below.
    const authUrl = await shopify.auth.begin({
      shop: sanitizedShop,
      callbackPath,
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    // Detect embedded context: Shopify passes `host` (base64 shop origin) or `embedded=1`
    const isEmbedded =
      typeof req.query.host === "string" || req.query.embedded === "1";

    if (!isEmbedded) {
      // Normal top-level browser — redirect into Shopify OAuth.
      // auth.begin() may have already called res.redirect() in some SDK versions;
      // only call it ourselves if the response hasn't been sent yet.
      if (!res.writableEnded) {
        return res.redirect(authUrl);
      }
      return;
    }

    // Embedded (inside an iframe) — perform an App Bridge breakout so the OAuth
    // redirect happens in the top-level window, not inside the iframe.
    const encodedAuthUrl = authUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    const host = typeof req.query.host === "string" ? req.query.host : "";

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL"); // allow Shopify admin iframe
    return res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Redirecting…</title>
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  </head>
  <body>
    <p>Redirecting to Shopify authorization…</p>
    <script>
      (function () {
        var authUrl = ${JSON.stringify(authUrl)};
        var apiKey   = ${JSON.stringify(SHOPIFY_API_KEY)};
        var host     = ${JSON.stringify(host)};

        // If we are already in the top frame, go directly
        if (window.top === window.self) {
          window.location.assign(authUrl);
          return;
        }

        // Try App Bridge redirect (works in Shopify Admin iframe)
        try {
          var AppBridge = window["app-bridge"] || window.shopify;
          if (AppBridge && AppBridge.createApp) {
            var app = AppBridge.createApp({ apiKey: apiKey, host: host });
            var Redirect = AppBridge.actions && AppBridge.actions.Redirect;
            if (Redirect) {
              Redirect.create(app).dispatch(Redirect.Action.REMOTE, authUrl);
              return;
            }
          }
        } catch (e) {
          // fall through
        }

        // Fallback: break out of iframe directly
        window.top.location.href = authUrl;
      })();
    </script>
  </body>
</html>`);
  } catch (error: any) {
    console.error("Error starting OAuth:", {
      message: error?.message,
      stack: error?.stack,
      shop: req.query?.shop,
    });
    return res.status(500).json({ error: `Failed to start OAuth flow: ${error?.message || "Unknown error"}` });
  }
}
