import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { ApiResponse, RollbackResponse } from "@/types";
import { generateId } from "@lib/price-utils";
import { createShopifyAPI } from "@lib/shopify-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<RollbackResponse>>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const db = await initDb();
    const { changeGroupId } = req.body;

    if (!changeGroupId) {
      return res.status(400).json({ success: false, error: "changeGroupId is required" });
    }

    // Get rollback snapshot
    const snapshot = await db.get("SELECT * FROM rollbackSnapshots WHERE changeGroupId = ?", [changeGroupId]);

    if (!snapshot) {
      return res.status(404).json({ success: false, error: "No rollback data found for this change" });
    }

    const rollbackData = JSON.parse(snapshot.variantSnapshots);
    const settings = await db.get("SELECT * FROM settings LIMIT 1");

    if (!settings) {
      return res.status(400).json({ success: false, error: "Settings not configured" });
    }

    const shopifyAPI = createShopifyAPI(settings.apiKey, settings.apiPassword, settings.shop);

    // Restore all variants
    for (const item of rollbackData) {
      try {
        // Update in Shopify
        await shopifyAPI.updateVariantPrice(item.shopifyId, item.price, item.compareAtPrice);
      } catch (error) {
        console.error(`Error rolling back variant ${item.shopifyId}:`, error);
      }

      // Update in database
      await db.run("UPDATE variants SET price = ?, compareAtPrice = ?, updatedAt = ? WHERE id = ?", [
        item.price,
        item.compareAtPrice,
        new Date().toISOString(),
        item.variantId,
      ]);
    }

    // Log the rollback
    const logId = generateId("log");
    await db.run(
      "INSERT INTO activityLog (id, action, affectedCount, changeGroupId, timestamp) VALUES (?, ?, ?, ?, ?)",
      [logId, "Rolled back price changes", rollbackData.length, changeGroupId, new Date().toISOString()]
    );

    return res.status(200).json({
      success: true,
      data: {
        success: true,
        affectedCount: rollbackData.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error rolling back changes:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
