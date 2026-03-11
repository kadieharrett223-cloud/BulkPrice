import type { NextApiRequest, NextApiResponse } from "next";
import { getRawBody, validateWebhook } from "@/lib/webhook-utils";
import { initDb } from "@/lib/db";
import { generateId } from "@/lib/price-utils";

function getAffectedRows(result: any): number {
  if (typeof result?.changes === "number") return result.changes;
  if (typeof result?.rowCount === "number") return result.rowCount;
  return 0;
}

function normalizeWebhookPlan(name: string | undefined, status: string | undefined): "starter" | "premium" {
  const normalizedName = (name || "").toLowerCase();
  const normalizedStatus = (status || "").toLowerCase();

  const activeStatuses = new Set(["active", "accepted", "approved"]);
  if (!activeStatuses.has(normalizedStatus)) {
    return "starter";
  }

  if (normalizedName.includes("premium") || normalizedName.includes("pro") || normalizedName.includes("advanced")) {
    return "premium";
  }

  return "starter";
}

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

    if (shop) {
      const plan = normalizeWebhookPlan(payload?.app_subscription?.name, payload?.app_subscription?.status);

      const db = await initDb();
      const now = new Date().toISOString();

      const updated = await db.run("UPDATE settings SET plan = ?, updatedAt = ? WHERE shop = ?", [
        plan,
        now,
        shop,
      ]);

      if (getAffectedRows(updated) === 0) {
        await db.run(
          `INSERT INTO settings (id, shop, plan, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?)`,
          [generateId("settings"), shop, plan, now, now]
        );
      }
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
