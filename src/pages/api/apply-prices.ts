import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { PriceFilter, PriceAction, ApiResponse } from "@/types";
import { calculateNewPrice, generateId } from "@lib/price-utils";
import { createShopifyAPI } from "@lib/shopify-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const db = await initDb();
    const { filters, action, changeGroupId }: { filters: PriceFilter; action: PriceAction; changeGroupId: string } = req.body;

    // Get settings
    const settings = await db.get("SELECT * FROM settings LIMIT 1");
    if (!settings) {
      return res.status(400).json({ success: false, error: "Settings not configured" });
    }

    // Build filter query
    let filterQuery = "WHERE 1=1";
    const params: any[] = [];

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

    // Get all matching variants
    const variants = await db.all(
      `
      SELECT v.*, p.id as productId
      FROM variants v
      JOIN products p ON v.productId = p.id
      ${filterQuery}
    `,
      params
    );

    const shopifyAPI = createShopifyAPI(settings.apiKey, settings.apiPassword, settings.shop);
    const updates: any[] = [];

    for (const variant of variants) {
      const newPrice = calculateNewPrice(variant.price, action);
      let newCompareAtPrice = variant.compareAtPrice;

      // Update compare-at price if specified
      if (action.includeCompareAt && action.compareAtAdjustment) {
        if (newCompareAtPrice) {
          if (action.compareAtAdjustment.type === "percentage") {
            newCompareAtPrice = Math.round((newPrice * (1 + action.compareAtAdjustment.value / 100)) * 100) / 100;
          } else {
            newCompareAtPrice = Math.round((newPrice + action.compareAtAdjustment.value) * 100) / 100;
          }
        }
      }

      // Update variant in Shopify (via API)
      try {
        await shopifyAPI.updateVariantPrice(variant.shopifyId, newPrice, newCompareAtPrice);
      } catch (error) {
        console.error(`Error updating variant ${variant.shopifyId}:`, error);
      }

      // Store price history
      const historyId = generateId("history");
      await db.run(
        `
        INSERT INTO priceHistory (id, variantId, productId, oldPrice, newPrice, oldCompareAtPrice, newCompareAtPrice, changeType, percentage, changeGroupId, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          historyId,
          variant.id,
          variant.productId,
          variant.price,
          newPrice,
          variant.compareAtPrice,
          newCompareAtPrice,
          action.type,
          action.value,
          changeGroupId,
          new Date().toISOString(),
        ]
      );

      // Update variant in database
      await db.run(
        `
        UPDATE variants SET price = ?, compareAtPrice = ?, updatedAt = ? WHERE id = ?
      `,
        [newPrice, newCompareAtPrice, new Date().toISOString(), variant.id]
      );

      updates.push({
        variantId: variant.id,
        oldPrice: variant.price,
        newPrice,
      });
    }

    // Create rollback snapshot
    const snapshotId = generateId("snapshot");
    const rollbackData = variants.map((v) => ({
      variantId: v.id,
      shopifyId: v.shopifyId,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
    }));

    await db.run(
      `
      INSERT INTO rollbackSnapshots (id, changeGroupId, variantSnapshots, createdAt, expiresAt)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        snapshotId,
        changeGroupId,
        JSON.stringify(rollbackData),
        new Date().toISOString(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      ]
    );

    // Log activity
    const logId = generateId("log");
    await db.run(
      `
      INSERT INTO activityLog (id, action, affectedCount, changeGroupId, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `,
      [logId, `Applied ${action.type} to variants`, variants.length, changeGroupId, new Date().toISOString()]
    );

    return res.status(200).json({
      success: true,
      data: {
        changeGroupId,
        affectedCount: variants.length,
        updates,
      },
    });
  } catch (error: any) {
    console.error("Error applying price changes:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
