import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { ApiResponse, ActivityLog } from "@/types";
import { DEMO_SHOP, isDemoShop, getDemoLog } from "@lib/mock-data";
import { verifySessionToken } from "@/lib/verify-session-token";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<ActivityLog[]>>) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { limit = 50, offset = 0 } = req.query;
    const shop = typeof req.query.shop === "string" ? req.query.shop : DEMO_SHOP;

    // ── Demo mode ──────────────────────────────────────────────────────────────
    if (isDemoShop(shop)) {
      const logs = getDemoLog(parseInt(limit as string), parseInt(offset as string));
      return res.status(200).json({ success: true, data: logs as any });
    }

    const tokenPayload = await verifySessionToken(req, shop);
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const db = await initDb();

    const logs = await db.all(
      `
      SELECT * FROM activityLog
      WHERE shop = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `,
      [shop, parseInt(limit as string), parseInt(offset as string)]
    );

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error("Error fetching activity log:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
