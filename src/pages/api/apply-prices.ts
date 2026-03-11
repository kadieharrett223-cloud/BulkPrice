import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { PriceFilter, PriceAction, ApiResponse } from "@/types";
import { applyMarginProtection, calculateNewPrice, generateId } from "@lib/price-utils";
import { verifySessionToken } from "@/lib/verify-session-token";
import {
  isDemoShop,
  getMockVariants,
  getMockProducts,
  applyMockPriceUpdate,
  addDemoLogEntry,
  saveDemoRollbackSnapshot,
} from "@lib/mock-data";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const startedAt = Date.now();
    const { filters, action, changeGroupId, shop }: { filters: PriceFilter; action: PriceAction; changeGroupId: string; shop: string } = req.body;

    if (!shop) {
      return res.status(400).json({ success: false, error: "Shop parameter required" });
    }

    // ── Demo mode: apply prices to in-memory mock data ────────────────────────
    if (isDemoShop(shop)) {
      const allVariants = getMockVariants();
      const allProducts = getMockProducts();
      const targetField = action.targetField || "base";

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

      const demoChangeGroupId = changeGroupId || `demo-group-${Date.now()}`;
      try {
        saveDemoRollbackSnapshot(
          demoChangeGroupId,
          matchedVariants.map((variant) => ({
            variantId: variant.id,
            shopifyId: variant.shopifyId,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice ?? null,
          }))
        );
      } catch (snapshotError) {
        console.error("Unable to store demo rollback snapshot:", snapshotError);
      }

      const updates: any[] = [];
      for (const v of matchedVariants) {
        const baseCalculated = calculateNewPrice(v.price, action);
        const { price: protectedBasePrice } = applyMarginProtection(baseCalculated, v.price, action, v.cost ?? undefined);
        const compareSource = v.compareAtPrice ?? v.price;
        const compareCalculated = calculateNewPrice(compareSource, action);
        const newPrice = targetField === "compare_at" ? v.price : protectedBasePrice;
        const newCompareAtPrice =
          targetField === "base"
            ? v.compareAtPrice
            : Math.round(compareCalculated * 100) / 100;

        applyMockPriceUpdate(v.id, newPrice, newCompareAtPrice);
        updates.push({ variantId: v.id, oldPrice: v.price, newPrice });
      }

      try {
        addDemoLogEntry({
          id: `demo-log-${Date.now()}`,
          shop,
          action: `Applied ${action.type} to variants`,
          affectedCount: matchedVariants.length,
          changeGroupId: demoChangeGroupId,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error("Unable to append demo activity log:", logError);
      }

      return res.status(200).json({
        success: true,
        data: {
          changeGroupId: demoChangeGroupId,
          affectedCount: matchedVariants.length,
          failedCount: 0,
          durationMs: Date.now() - startedAt,
          updates,
        },
      });
    }

    const tokenPayload = await verifySessionToken(req, shop);
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const db = await initDb();
    const [{ sessionStorage }, { shopify }] = await Promise.all([
      import("@lib/session-storage"),
      import("@lib/shopify-config"),
    ]);

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
    const attemptedCount = variants.length;
    const targetField = action.targetField || "base";

    for (const variant of variants) {
      const oldPrice = Number(variant.price);
      const oldCompareAtPrice =
        variant.compareAtPrice === null || variant.compareAtPrice === undefined
          ? null
          : Number(variant.compareAtPrice);

      if (!Number.isFinite(oldPrice)) {
        failedCount += 1;
        continue;
      }

      const baseCalculated = calculateNewPrice(oldPrice, action);
      const { price: protectedBasePrice } = applyMarginProtection(
        baseCalculated,
        oldPrice,
        action,
        variant.cost
      );

      const compareSource = oldCompareAtPrice ?? oldPrice;
      const compareCalculated = calculateNewPrice(compareSource, action);

      const newPrice = targetField === "compare_at" ? oldPrice : protectedBasePrice;
      const newCompareAtPrice =
        targetField === "base"
          ? oldCompareAtPrice
          : Math.round(compareCalculated * 100) / 100;

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

        const response: any = await client.request(mutation, {
          variables,
        });

        const payload = response?.data?.productVariantUpdate || response?.body?.data?.productVariantUpdate;
        const userErrors = payload?.userErrors || [];

        if (userErrors.length > 0) {
          console.error(`Errors updating variant ${variant.shopifyId}:`, userErrors);
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
          oldPrice,
          newPrice,
          oldCompareAtPrice,
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
        oldPrice,
        newPrice,
      });
    }

    const successCount = updates.length;

    if (attemptedCount > 0 && successCount === 0) {
      return res.status(502).json({
        success: false,
        error: "Failed to update prices in Shopify. Please check app scopes and re-authenticate.",
        data: {
          changeGroupId,
          attemptedCount,
          affectedCount: 0,
          failedCount,
          durationMs: Date.now() - startedAt,
          updates,
        },
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
      [logId, shop, `Applied ${action.type} to variants`, successCount, changeGroupId, new Date().toISOString()]
    );

    return res.status(200).json({
      success: true,
      data: {
        changeGroupId,
        attemptedCount,
        affectedCount: successCount,
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
