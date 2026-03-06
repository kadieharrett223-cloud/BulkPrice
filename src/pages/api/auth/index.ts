import { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify-config";
import { sessionStorage } from "@/lib/session-storage";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { shop } = req.query;

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({ error: "Missing shop parameter" });
    }

    // Sanitize shop domain
    const sanitizedShop = shopify.utils.sanitizeShop(shop);
    
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

    res.redirect(authRoute);
  } catch (error) {
    console.error("Error starting OAuth:", error);
    res.status(500).json({ error: "Failed to start OAuth flow" });
  }
}
