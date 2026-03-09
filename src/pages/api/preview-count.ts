import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { PriceFilter, ApiResponse } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<{ count: number }>>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const db = await initDb();
    const { filters, shop }: { filters: PriceFilter; shop: string } = req.body;

    if (!shop) {
      return res.status(400).json({ success: false, error: "Shop parameter required" });
    }

    let filterQuery = "WHERE p.shop = ? AND v.shop = ?";
    const params: any[] = [shop, shop];

    if (filters.collections?.length) {
      filterQuery += " AND (p.collections LIKE ?)";
      params.push(`%${filters.collections[0]}%`);
    }

    if (filters.vendors?.length) {
      filterQuery += ` AND (p.vendor IN (${filters.vendors.map(() => "?").join(",")}))`;
      params.push(...filters.vendors);
    }

    if (filters.productTypes?.length) {
      filterQuery += ` AND (p.productType IN (${filters.productTypes.map(() => "?").join(",")}))`;
      params.push(...filters.productTypes);
    }

    if (filters.statuses?.length) {
      filterQuery += ` AND (p.status IN (${filters.statuses.map(() => "?").join(",")}))`;
      params.push(...filters.statuses);
    }

    if (filters.tags?.length) {
      filterQuery += " AND (p.tags LIKE ?)";
      params.push(`%${filters.tags[0]}%`);
    }

    if (filters.priceRange) {
      filterQuery += " AND (v.price >= ? AND v.price <= ?)";
      params.push(filters.priceRange.min, filters.priceRange.max);
    }

    if (filters.inventoryRange) {
      filterQuery += " AND (v.inventory >= ? AND v.inventory <= ?)";
      params.push(filters.inventoryRange.min, filters.inventoryRange.max);
    }

    const result = await db.get(
      `
      SELECT COUNT(*) as count
      FROM variants v
      JOIN products p ON v.productId = p.id
      ${filterQuery}
    `,
      params
    );

    return res.status(200).json({
      success: true,
      data: {
        count: Number(result?.count || 0),
      },
    });
  } catch (error: any) {
    console.error("Error fetching preview count:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
