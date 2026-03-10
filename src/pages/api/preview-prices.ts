import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { PriceFilter, PriceAction, ApiResponse, PriceChangeResponse, PricePreview } from "@/types";
import { applyMarginProtection, calculateNewPrice, generateChangeGroupId } from "@lib/price-utils";
import { isDemoShop, getMockVariants, getMockProducts } from "@lib/mock-data";
import { verifySessionToken } from "@/lib/verify-session-token";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<PriceChangeResponse>>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { filters, action, shop }: { filters: PriceFilter; action: PriceAction; shop: string } = req.body;

    if (!shop) {
      return res.status(400).json({ success: false, error: "Shop parameter required" });
    }

    // ── Demo mode: compute preview from in-memory mock data ──────────────────────
    if (isDemoShop(shop)) {
      const allVariants = getMockVariants();
      const allProducts = getMockProducts();

      const matchedVariants = allVariants.filter((v) => {
        const product = allProducts.find((p) => p.id === v.productId);
        if (!product) return false;
        if (filters.collections?.length && !filters.collections.some((c) => product.collections.includes(c))) return false;
        if (filters.vendors?.length && !filters.vendors.includes(product.vendor)) return false;
        if (filters.productTypes?.length && !filters.productTypes.includes(product.productType)) return false;
        if (filters.statuses?.length && !filters.statuses.includes(product.status)) return false;
        if (filters.tags?.length && !filters.tags.some((t) => product.tags.includes(t))) return false;
        if (filters.priceRange && (v.price < filters.priceRange.min || v.price > filters.priceRange.max)) return false;
        if (filters.inventoryRange && (v.inventory < filters.inventoryRange.min || v.inventory > filters.inventoryRange.max)) return false;
        return true;
      });

      if (!matchedVariants.length) {
        return res.status(200).json({ success: true, data: { changeGroupId: "", affectedCount: 0, preview: [] } });
      }

      const changeGroupId = generateChangeGroupId();
      const targetField = action.targetField || "base";

      const preview: PricePreview[] = matchedVariants.map((v) => {
        const product = allProducts.find((p) => p.id === v.productId)!;
        const baseCalculated = calculateNewPrice(v.price, action);
        const protectedBaseResult = applyMarginProtection(baseCalculated, v.price, action, v.cost ?? undefined);
        const compareBaseSource = v.compareAtPrice ?? v.price;
        const compareCalculated = calculateNewPrice(compareBaseSource, action);

        const newPrice = targetField === "compare_at" ? v.price : protectedBaseResult.price;
        const newCompareAtPrice =
          targetField === "base" ? v.compareAtPrice : Math.round(compareCalculated * 100) / 100;

        return {
          variantId: v.id,
          productId: v.productId,
          productTitle: product.title,
          variantTitle: v.title,
          oldPrice: v.price,
          newPrice,
          oldCompareAtPrice: v.compareAtPrice ?? undefined,
          newCompareAtPrice: newCompareAtPrice ?? undefined,
          change: ((newPrice - v.price) / v.price) * 100,
          savings: Math.max(0, v.price - newPrice),
          wasProtected: targetField === "compare_at" ? false : protectedBaseResult.wasProtected,
          protectionFloor: targetField === "compare_at" ? undefined : protectedBaseResult.floor,
        };
      });

      return res.status(200).json({
        success: true,
        data: { changeGroupId, affectedCount: matchedVariants.length, preview },
      });
    }

    const tokenPayload = await verifySessionToken(req, shop);
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }


    const db = await initDb();

    // Build filter query
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
      const targetField = action.targetField || "base";
      const baseCalculated = calculateNewPrice(v.price, action);
      const protectedBaseResult = applyMarginProtection(baseCalculated, v.price, action, v.cost);
      const compareBaseSource = v.compareAtPrice ?? v.price;
      const compareCalculated = calculateNewPrice(compareBaseSource, action);

      const newPrice = targetField === "compare_at" ? v.price : protectedBaseResult.price;
      const newCompareAtPrice =
        targetField === "base"
          ? v.compareAtPrice
          : Math.round(compareCalculated * 100) / 100;

      return {
        variantId: v.id,
        productId: v.productId,
        productTitle: v.productTitle,
        variantTitle: v.title,
        oldPrice: v.price,
        newPrice,
        oldCompareAtPrice: v.compareAtPrice,
        newCompareAtPrice,
        change: ((newPrice - v.price) / v.price) * 100,
        savings: Math.max(0, v.price - newPrice),
        wasProtected: targetField === "compare_at" ? false : protectedBaseResult.wasProtected,
        protectionFloor: targetField === "compare_at" ? undefined : protectedBaseResult.floor,
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
