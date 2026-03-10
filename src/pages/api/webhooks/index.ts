import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { initDb } from "@/lib/db";
import { sessionStorage } from "@/lib/session-storage";

function verifyWebhook(rawBody: string, hmacHeader: string | undefined) {
  if (!hmacHeader || !process.env.SHOPIFY_API_SECRET) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest, "base64"), Buffer.from(hmacHeader, "base64"));
  } catch {
    return false;
  }
}

async function getRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawBody = await getRawBody(req);
    const hmac = req.headers["x-shopify-hmac-sha256"] as string | undefined;
    const topic = (req.headers["x-shopify-topic"] as string | undefined) || "";
    const shop = req.headers["x-shopify-shop-domain"] as string | undefined;

    if (!verifyWebhook(rawBody, hmac)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = JSON.parse(rawBody || "{}");

    switch (topic) {
      case "customers/data_request":
        console.log("customers/data_request webhook received", {
          shop,
          customer: payload?.customer?.id,
          ordersRequested: payload?.orders_requested,
        });
        break;
      case "customers/redact":
        console.log("customers/redact webhook received", {
          shop,
          customer: payload?.customer?.id,
        });
        break;
      case "shop/redact": {
        const shopDomain = (payload?.shop_domain || shop) as string | undefined;

        if (shopDomain) {
          const sessions = await sessionStorage.findSessionsByShop(shopDomain);
          const sessionIds = sessions.map((session) => session.id);

          if (sessionIds.length > 0) {
            await sessionStorage.deleteSessions(sessionIds);
          }

          const db = await initDb();
          await db.run("DELETE FROM settings WHERE shop = ?", [shopDomain]);
        }

        console.log("shop/redact webhook received", { shop: shopDomain || shop });
        break;
      }
      default:
        console.log("Unhandled compliance webhook topic", { topic, shop });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error handling compliance webhook:", error);
    return res.status(500).json({ error: "Failed to process webhook" });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
