import type { NextApiRequest, NextApiResponse } from "next";
import { getRawBody, validateWebhook } from "@/lib/webhook-utils";
import { initDb } from "@/lib/db";
import { sessionStorage } from "@/lib/session-storage";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawBody = await getRawBody(req);
    const isValid = await validateWebhook(req, res, rawBody);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid webhook" });
    }

    const payload = JSON.parse(rawBody || "{}");
    const shop = (payload?.shop_domain || req.headers["x-shopify-shop-domain"]) as string | undefined;

    if (shop) {
      const sessions = await sessionStorage.findSessionsByShop(shop);
      const sessionIds = sessions.map((session) => session.id);

      if (sessionIds.length > 0) {
        await sessionStorage.deleteSessions(sessionIds);
      }

      const db = await initDb();
      await db.run("DELETE FROM settings WHERE shop = ?", [shop]);
    }

    console.log("shop/redact webhook received", { shop });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error handling shop/redact webhook:", error);
    return res.status(500).json({ error: "Failed to process webhook" });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
