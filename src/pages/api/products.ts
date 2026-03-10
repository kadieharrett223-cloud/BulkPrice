import type { NextApiRequest, NextApiResponse } from "next";
import { initDb, getDb } from "@lib/db";
import { ApiResponse } from "@/types";
import { DEMO_SHOP, isDemoShop, getMockProducts } from "@lib/mock-data";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { limit = 50, offset = 0 } = req.query;
    const shop = typeof req.query.shop === "string" ? req.query.shop : DEMO_SHOP;

    // ── Demo mode: return mock products ──────────────────────────────────────
    if (isDemoShop(shop)) {
      const allProducts = getMockProducts();
      const lim = parseInt(limit as string);
      const off = parseInt(offset as string);
      const sliced = allProducts.slice(off, off + lim);
      return res.status(200).json({
        success: true,
        data: { products: sliced, total: allProducts.length, limit: lim, offset: off },
      });
    }

    const db = await initDb();

    const products = await db.all(
      `
      SELECT p.*, 
             (SELECT COUNT(*) FROM variants WHERE productId = p.id) as variantCount
      FROM products p
      WHERE p.shop = ?
      LIMIT ? OFFSET ?
    `,
      [shop, parseInt(limit as string), parseInt(offset as string)]
    );

    const total = await db.get("SELECT COUNT(*) as count FROM products WHERE shop = ?", [shop]);

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
