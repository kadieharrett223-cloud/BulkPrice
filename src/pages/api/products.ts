import type { NextApiRequest, NextApiResponse } from "next";
import { initDb, getDb } from "@lib/db";
import { ApiResponse } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const db = await initDb();
    const { limit = 50, offset = 0 } = req.query;

    const products = await db.all(
      `
      SELECT p.*, 
             (SELECT COUNT(*) FROM variants WHERE productId = p.id) as variantCount
      FROM products p
      LIMIT ? OFFSET ?
    `,
      [parseInt(limit as string), parseInt(offset as string)]
    );

    const total = await db.get("SELECT COUNT(*) as count FROM products");

    return res.status(200).json({
      success: true,
      data: {
        products,
        total: total?.count || 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
