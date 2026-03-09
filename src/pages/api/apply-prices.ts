import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { PriceFilter, PriceAction, ApiResponse } from "@/types";
import { applyMarginProtection, calculateNewPrice, generateId } from "@lib/price-utils";
import { sessionStorage } from "@lib/session-storage";
import { shopify } from "@lib/shopify-config";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const db = await initDb();
    const startedAt = Date.now();
    const { filters, action, changeGroupId, shop }: { filters: PriceFilter; action: PriceAction; changeGroupId: string; shop: string } = req.body;

    if (!shop) {
      return res.status(400).json({ success: false, error: "Shop parameter required" });
    }

    // Get OAuth session
    const sessionId = shopify.session.getOfflineId(shop);
    const session = await sessionStorage.loadSession(sessionId);

    if (!session?.accessToken) {
      return res.status(401).json({ success: false, error: "Not authenticated. Please complete OAuth first." });
    }

    const settings = await db.get("SELECT plan FROM settings WHERE shop = ? LIMIT 1", [shop]);
    const rawPlan = (settings?.plan || "starter") as string;
    const normalizedPlan =
      rawPlan === "basic"
        ? "starter"
        : rawPlan === "pro" || rawPlan === "advanced"
        ? "premium"
        : rawPlan;

    if (normalizedPlan === "starter") {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);

      const usage = await db.get(
        `
        SELECT COUNT(DISTINCT changeGroupId) as count
        FROM priceHistory
        WHERE timestamp >= ?
          AND shop = ?
          AND changeGroupId IS NOT NULL
      `,
        [monthStart.toISOString(), shop]
      );

      const monthlyChanges = usage?.count || 0;
      const starterLimit = 5;

      if (monthlyChanges >= starterLimit) {
        return res.status(402).json({
          success: false,
          error: `Starter plan limit reached (${starterLimit} bulk price changes/month). Upgrade to Premium for unlimited changes.`,
          data: {
            code: "PLAN_LIMIT_REACHED",
            plan: normalizedPlan,
            limit: starterLimit,
            used: monthlyChanges,
          },
        });
      }
    }

    // Create GraphQL client
    const client = new shopify.clients.Graphql({ session });

    // Build filter query
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

    const updates: any[] = [];
    let failedCount = 0;

    for (const variant of variants) {
      const calculatedPrice = calculateNewPrice(variant.price, action);
      const { price: newPrice } = applyMarginProtection(
        calculatedPrice,
        variant.price,
        action,
        variant.cost
      );
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

      // Update variant in Shopify via GraphQL
      try {
        const variantGid = `gid://shopify/ProductVariant/${variant.shopifyId}`;
        const mutation = `
          mutation productVariantUpdate($input: ProductVariantInput!) {
            productVariantUpdate(input: $input) {
              productVariant {
                id
                price
                compareAtPrice
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const variables = {
          input: {
            id: variantGid,
            price: newPrice.toFixed(2),
            ...(newCompareAtPrice !== undefined && newCompareAtPrice !== null && {
              compareAtPrice: newCompareAtPrice.toFixed(2),
            }),
          },
        };

        const response: any = await client.query({
          data: {
            query: mutation,
            variables,
          },
        });

        if (response.body.data.productVariantUpdate.userErrors.length > 0) {
          console.error(`Errors updating variant ${variant.shopifyId}:`, response.body.data.productVariantUpdate.userErrors);
          failedCount += 1;
          continue;
        }
      } catch (error) {
        console.error(`Error updating variant ${variant.shopifyId}:`, error);
        failedCount += 1;
        continue;
      }

      // Store price history
      const historyId = generateId("history");
      await db.run(
        `
        INSERT INTO priceHistory (id, shop, variantId, productId, oldPrice, newPrice, oldCompareAtPrice, newCompareAtPrice, changeType, percentage, changeGroupId, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          historyId,
          shop,
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
      INSERT INTO rollbackSnapshots (id, shop, changeGroupId, variantSnapshots, createdAt, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        snapshotId,
        shop,
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
      INSERT INTO activityLog (id, shop, action, affectedCount, changeGroupId, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [logId, shop, `Applied ${action.type} to variants`, variants.length, changeGroupId, new Date().toISOString()]
    );

    return res.status(200).json({
      success: true,
      data: {
        changeGroupId,
        affectedCount: variants.length,
        failedCount,
        durationMs: Date.now() - startedAt,
        updates,
      },
    });
  } catch (error: any) {
    console.error("Error applying price changes:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
