import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { PriceFilter, ApiResponse } from "@/types";
import { isDemoShop, getMockVariants, getMockProducts } from "@lib/mock-data";

/** Count mock variants that satisfy a PriceFilter (used only in demo mode) */
function countMockVariants(filters: PriceFilter): number {
  const products = getMockProducts();
  const variants = getMockVariants();

  return variants.filter((v) => {
    const product = products.find((p) => p.id === v.productId);
    if (!product) return false;

    if (filters.collections?.length && !filters.collections.some((c) => product.collections.includes(c))) return false;
    if (filters.vendors?.length && !filters.vendors.includes(product.vendor)) return false;
    if (filters.productTypes?.length && !filters.productTypes.includes(product.productType)) return false;
    if (filters.statuses?.length && !filters.statuses.includes(product.status)) return false;
    if (filters.tags?.length && !filters.tags.some((t) => product.tags.includes(t))) return false;
    if (filters.priceRange && (v.price < filters.priceRange.min || v.price > filters.priceRange.max)) return false;
    if (filters.inventoryRange && (v.inventory < filters.inventoryRange.min || v.inventory > filters.inventoryRange.max)) return false;

    return true;
  }).length;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<{ count: number }>>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { filters, shop }: { filters: PriceFilter; shop: string } = req.body;

    if (!shop) {
      return res.status(400).json({ success: false, error: "Shop parameter required" });
    }

    // ── Demo mode: count matching mock variants ──────────────────────────────────
    if (isDemoShop(shop)) {
      const count = countMockVariants(filters);
      return res.status(200).json({ success: true, data: { count } });
    }

    const db = await initDb();

    let filterQuery = "WHERE p.shop = ? AND v.shop = ?";
    const params: any[] = [shop, shop];

    if (filters.collections?.length) {
      filterQuery += ` AND (${filters.collections.map(() => "p.collections LIKE ?").join(" OR ")})`;
      params.push(...filters.collections.map((value) => `%${value}%`));
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
