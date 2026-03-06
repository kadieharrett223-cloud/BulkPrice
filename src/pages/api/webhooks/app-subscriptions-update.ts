import type { NextApiRequest, NextApiResponse } from "next";
import { getRawBody, validateWebhook } from "@/lib/webhook-utils";
import { initDb } from "@/lib/db";

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
    const shop = req.headers["x-shopify-shop-domain"] as string | undefined;

    if (shop && payload?.app_subscription?.name) {
      const planName = String(payload.app_subscription.name).toLowerCase();
      const plan = planName.includes("pro") ? "pro" : "basic";

      const db = await initDb();
      await db.run("UPDATE settings SET plan = ?, updatedAt = ? WHERE shop = ?", [
        plan,
        new Date().toISOString(),
        shop,
      ]);
    }

    console.log("app_subscriptions/update webhook received", {
      shop,
      status: payload?.app_subscription?.status,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error handling app_subscriptions/update webhook:", error);
    return res.status(500).json({ error: "Failed to process webhook" });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
