import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { ApiResponse, RollbackResponse } from "@/types";
import { generateId } from "@lib/price-utils";
import { sessionStorage } from "@lib/session-storage";
import { shopify } from "@lib/shopify-config";
import {
  clearDemoRollbackSnapshot,
  getDemoRollbackSnapshot,
  isDemoShop,
  restoreMockVariants,
  addDemoLogEntry,
} from "@lib/mock-data";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<RollbackResponse>>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { changeGroupId, shop } = req.body;

    if (!changeGroupId || !shop) {
      return res.status(400).json({ success: false, error: "changeGroupId and shop are required" });
    }

    if (isDemoShop(shop)) {
      const snapshot = getDemoRollbackSnapshot(changeGroupId);

      if (!snapshot) {
        return res.status(404).json({ success: false, error: "No rollback data found for this demo change" });
      }

      restoreMockVariants(snapshot);
      clearDemoRollbackSnapshot(changeGroupId);
      addDemoLogEntry({
        id: `demo-log-${Date.now()}`,
        shop,
        action: "Rolled back price changes",
        affectedCount: snapshot.length,
        changeGroupId,
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({
        success: true,
        data: {
          success: true,
          affectedCount: snapshot.length,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const db = await initDb();

    const sessionId = shopify.session.getOfflineId(shop);
    const session = await sessionStorage.loadSession(sessionId);
    if (!session?.accessToken) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const client = new shopify.clients.Graphql({ session });

    // Get rollback snapshot
    const snapshot = await db.get("SELECT * FROM rollbackSnapshots WHERE changeGroupId = ? AND shop = ?", [changeGroupId, shop]);

    if (!snapshot) {
      return res.status(404).json({ success: false, error: "No rollback data found for this change" });
    }

    const rollbackData = JSON.parse(snapshot.variantSnapshots);

    // Restore all variants
    for (const item of rollbackData) {
      try {
        const mutation = `
          mutation productVariantUpdate($input: ProductVariantInput!) {
            productVariantUpdate(input: $input) {
              productVariant { id }
              userErrors { message }
            }
          }
        `;

        const response: any = await client.query({
          data: {
            query: mutation,
            variables: {
              input: {
                id: `gid://shopify/ProductVariant/${item.shopifyId}`,
                price: Number(item.price).toFixed(2),
                ...(item.compareAtPrice !== null && item.compareAtPrice !== undefined
                  ? { compareAtPrice: Number(item.compareAtPrice).toFixed(2) }
                  : {}),
              },
            },
          },
        });

        const errors = response?.body?.data?.productVariantUpdate?.userErrors || [];
        if (errors.length > 0) {
          throw new Error(errors[0].message || "Shopify rollback failed");
        }
      } catch (error) {
        console.error(`Error rolling back variant ${item.shopifyId}:`, error);
      }

      // Update in database
      await db.run("UPDATE variants SET price = ?, compareAtPrice = ?, updatedAt = ? WHERE id = ? AND shop = ?", [
        item.price,
        item.compareAtPrice,
        new Date().toISOString(),
        item.variantId,
        shop,
      ]);
    }

    // Log the rollback
    const logId = generateId("log");
    await db.run(
      "INSERT INTO activityLog (id, shop, action, affectedCount, changeGroupId, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
      [logId, shop, "Rolled back price changes", rollbackData.length, changeGroupId, new Date().toISOString()]
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
