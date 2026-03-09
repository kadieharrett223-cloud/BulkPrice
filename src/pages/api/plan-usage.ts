import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { shop } = req.query;

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({ success: false, error: "Missing shop parameter" });
    }

    const db = await initDb();
    const settings = await db.get("SELECT plan FROM settings WHERE shop = ? LIMIT 1", [shop]);

    const rawPlan = (settings?.plan || "starter") as string;
    const normalizedPlan =
      rawPlan === "basic"
        ? "starter"
        : rawPlan === "pro" || rawPlan === "advanced"
        ? "premium"
        : rawPlan;

    if (normalizedPlan === "premium") {
      return res.status(200).json({
        success: true,
        data: {
          plan: "premium",
          used: null,
          limit: null,
          remaining: null,
          label: "Unlimited price changes left",
        },
      });
    }

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const usage = await db.get(
      `
      SELECT COUNT(DISTINCT changeGroupId) as count
      FROM priceHistory
      WHERE timestamp >= ?
        AND changeGroupId IS NOT NULL
    `,
      [monthStart.toISOString()]
    );

    const starterLimit = 5;
    const used = usage?.count || 0;
    const remaining = Math.max(0, starterLimit - used);

    return res.status(200).json({
      success: true,
      data: {
        plan: "starter",
        used,
        limit: starterLimit,
        remaining,
        label: `${remaining} price changes left`,
      },
    });
  } catch (error: any) {
    console.error("Error fetching plan usage:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch plan usage" });
  }
}
