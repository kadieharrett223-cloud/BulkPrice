import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { ApiResponse, ActivityLog } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<ActivityLog[]>>) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const db = await initDb();
    const { limit = 50, offset = 0 } = req.query;

    const logs = await db.all(
      `
      SELECT * FROM activityLog
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `,
      [parseInt(limit as string), parseInt(offset as string)]
    );

    const total = await db.get("SELECT COUNT(*) as count FROM activityLog");

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error("Error fetching activity log:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
