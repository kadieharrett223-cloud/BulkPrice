import { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify-config";
import { sessionStorage } from "@/lib/session-storage";
import { initDb } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify webhook is from Shopify
    const isValid = await shopify.webhooks.validate({
      rawBody: JSON.stringify(req.body),
      rawRequest: req,
      rawResponse: res,
    });

    if (!isValid) {
      return res.status(401).json({ error: "Invalid webhook" });
    }

    const shop = req.headers["x-shopify-shop-domain"] as string;

    if (!shop) {
      return res.status(400).json({ error: "Missing shop domain" });
    }

    // Delete all sessions for this shop
    const sessions = await sessionStorage.findSessionsByShop(shop);
    const sessionIds = sessions.map((s) => s.id);
    
    if (sessionIds.length > 0) {
      await sessionStorage.deleteSessions(sessionIds);
    }

    // Optionally: Clean up shop data from database
    const db = await initDb();
    await db.run("DELETE FROM settings WHERE shop = ?", [shop]);
    
    console.log(`App uninstalled from shop: ${shop}`);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error handling app uninstall webhook:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};
