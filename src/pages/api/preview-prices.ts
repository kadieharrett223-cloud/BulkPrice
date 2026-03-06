import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { PriceFilter, PriceAction, ApiResponse, PriceChangeResponse, PricePreview } from "@/types";
import { applyMarginProtection, calculateNewPrice, generateChangeGroupId } from "@lib/price-utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<PriceChangeResponse>>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const db = await initDb();
    const { filters, action }: { filters: PriceFilter; action: PriceAction } = req.body;

    // Build filter query
    let filterQuery = "WHERE 1=1";
    const params: any[] = [];

    if (filters.collections?.length) {
      filterQuery += " AND (collections LIKE ?)";
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
      filterQuery += " AND (tags LIKE ?)";
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

    // Get variants matching filters
    const variants = await db.all(
      `
      SELECT v.*, p.title as productTitle
      FROM variants v
      JOIN products p ON v.productId = p.id
      ${filterQuery}
    `,
      params
    );

    if (!variants.length) {
      return res.status(200).json({
        success: true,
        data: {
          changeGroupId: "",
          affectedCount: 0,
          preview: [],
        },
      });
    }

    // Generate preview
    const changeGroupId = generateChangeGroupId();
    const preview: PricePreview[] = variants.map((v) => {
      const calculatedPrice = calculateNewPrice(v.price, action);
      const protectedResult = applyMarginProtection(calculatedPrice, v.price, action, v.cost);
      const newPrice = protectedResult.price;

      return {
        variantId: v.id,
        productId: v.productId,
        productTitle: v.productTitle,
        variantTitle: v.title,
        oldPrice: v.price,
        newPrice,
        oldCompareAtPrice: v.compareAtPrice,
        change: ((newPrice - v.price) / v.price) * 100,
        savings: Math.max(0, v.price - newPrice),
        wasProtected: protectedResult.wasProtected,
        protectionFloor: protectedResult.floor,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        changeGroupId,
        affectedCount: variants.length,
        preview,
        estimatedTime: undefined,
      },
    });
  } catch (error: any) {
    console.error("Error previewing price changes:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
