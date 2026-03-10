import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { ApiResponse, PriceAction, PriceFilter } from "@/types";
import { applyMarginProtection, calculateNewPrice, generateId } from "@lib/price-utils";
import { isDemoShop } from "@lib/mock-data";
import { sessionStorage } from "@lib/session-storage";
import { shopify } from "@lib/shopify-config";
import { verifySessionToken } from "@/lib/verify-session-token";

async function updateVariantInShopify(client: any, shopifyVariantId: string, price: number, compareAtPrice?: number | null) {
  const variantGid = `gid://shopify/ProductVariant/${shopifyVariantId}`;
  const mutation = `
    mutation productVariantUpdate($input: ProductVariantInput!) {
      productVariantUpdate(input: $input) {
        productVariant { id }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    input: {
      id: variantGid,
      price: price.toFixed(2),
      ...(compareAtPrice !== undefined && compareAtPrice !== null
        ? { compareAtPrice: compareAtPrice.toFixed(2) }
        : {}),
    },
  };

  const response: any = await client.query({
    data: {
      query: mutation,
      variables,
    },
  });

  const errors = response?.body?.data?.productVariantUpdate?.userErrors || [];
  if (errors.length > 0) {
    throw new Error(errors[0].message || "Shopify update failed");
  }
}

function buildFilterQuery(filters: PriceFilter, shop: string) {
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

  return { filterQuery, params };
}

async function runForShop(shop: string) {
  const db = await initDb();
  const sessionId = shopify.session.getOfflineId(shop);
  const session = await sessionStorage.loadSession(sessionId);
  if (!session?.accessToken) {
    return { shop, appliedSchedules: 0, appliedVariants: 0, revertedSchedules: 0, revertedVariants: 0 };
  }

  const client = new shopify.clients.Graphql({ session });
  const nowIso = new Date().toISOString();

  const dueSchedules = await db.all(
    `
    SELECT * FROM scheduledChanges
    WHERE shop = ?
      AND status = 'scheduled'
      AND startTime <= ?
    ORDER BY startTime ASC
  `,
    [shop, nowIso]
  );

  let appliedSchedules = 0;
  let appliedVariants = 0;

  for (const schedule of dueSchedules) {
    const filters = JSON.parse(schedule.filters || "{}");
    const action: PriceAction = JSON.parse(schedule.action || "{}");
    const targetField = action.targetField || "base";
    const { filterQuery, params } = buildFilterQuery(filters, shop);

    const variants = await db.all(
      `
      SELECT v.*, p.id as productId
      FROM variants v
      JOIN products p ON v.productId = p.id
      ${filterQuery}
    `,
      params
    );

    for (const variant of variants) {
      const baseCalculated = calculateNewPrice(Number(variant.price), action);
      const { price: protectedBasePrice } = applyMarginProtection(
        baseCalculated,
        Number(variant.price),
        action,
        variant.cost
      );

      const compareSource = variant.compareAtPrice ?? variant.price;
      const compareCalculated = calculateNewPrice(Number(compareSource), action);

      const newPrice = targetField === "compare_at" ? Number(variant.price) : protectedBasePrice;
      const newCompareAtPrice =
        targetField === "base"
          ? variant.compareAtPrice
          : Math.round(Number(compareCalculated) * 100) / 100;

      try {
        await updateVariantInShopify(client, variant.shopifyId, newPrice, newCompareAtPrice);
      } catch {
        continue;
      }

      const itemId = generateId("scheduled_item");
      await db.run(
        `
        INSERT INTO scheduledChangeItems (id, shop, scheduledChangeId, variantId, originalPrice)
        VALUES (?, ?, ?, ?, ?)
      `,
        [itemId, shop, schedule.id, variant.id, variant.price]
      );

      await db.run(
        "UPDATE variants SET price = ?, compareAtPrice = ?, updatedAt = ? WHERE id = ? AND shop = ?",
        [newPrice, newCompareAtPrice, nowIso, variant.id, shop]
      );

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
          schedule.id,
          nowIso,
        ]
      );

      appliedVariants += 1;
    }

    const nextStatus = schedule.endTime ? "active" : "completed";
    await db.run("UPDATE scheduledChanges SET status = ?, updatedAt = ? WHERE id = ? AND shop = ?", [
      nextStatus,
      nowIso,
      schedule.id,
      shop,
    ]);

    appliedSchedules += 1;
  }

  const endedSchedules = await db.all(
    `
    SELECT * FROM scheduledChanges
    WHERE shop = ?
      AND status = 'active'
      AND autoRevert = 1
      AND endTime IS NOT NULL
      AND endTime <= ?
  `,
    [shop, nowIso]
  );

  let revertedSchedules = 0;
  let revertedVariants = 0;

  for (const schedule of endedSchedules) {
    const items = await db.all(
      "SELECT * FROM scheduledChangeItems WHERE scheduledChangeId = ? AND shop = ?",
      [schedule.id, shop]
    );

    for (const item of items) {
      const variant = await db.get("SELECT * FROM variants WHERE id = ? AND shop = ?", [item.variantId, shop]);
      if (!variant) continue;

      try {
        await updateVariantInShopify(client, variant.shopifyId, Number(item.originalPrice), variant.compareAtPrice);
      } catch {
        continue;
      }

      await db.run(
        "UPDATE variants SET price = ?, updatedAt = ? WHERE id = ? AND shop = ?",
        [item.originalPrice, nowIso, item.variantId, shop]
      );

      revertedVariants += 1;
    }

    await db.run("UPDATE scheduledChanges SET status = 'completed', updatedAt = ? WHERE id = ? AND shop = ?", [
      nowIso,
      schedule.id,
      shop,
    ]);

    revertedSchedules += 1;
  }

  if (appliedSchedules > 0 || revertedSchedules > 0) {
    const logId = generateId("log");
    await db.run(
      `
      INSERT INTO activityLog (id, shop, action, details, affectedCount, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        logId,
        shop,
        "Scheduled sales runner executed",
        `Applied ${appliedSchedules} schedule(s), reverted ${revertedSchedules} schedule(s)`,
        appliedVariants + revertedVariants,
        nowIso,
      ]
    );
  }

  return { shop, appliedSchedules, appliedVariants, revertedSchedules, revertedVariants };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const shopFromBody = req.method === "POST" ? (req.body as { shop?: string })?.shop : undefined;
    const shopFromQuery = typeof req.query.shop === "string" ? req.query.shop : undefined;
    const requestedShop = shopFromBody || shopFromQuery;

    if (req.method === "POST" && requestedShop && !isDemoShop(requestedShop)) {
      const tokenPayload = await verifySessionToken(req, requestedShop);
      if (!tokenPayload) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
    }

    const db = await initDb();
    const shopsToRun = requestedShop
      ? [requestedShop]
      : (await db.all("SELECT DISTINCT shop FROM scheduledChanges WHERE shop IS NOT NULL"))
          .map((row: any) => row.shop)
          .filter(Boolean);

    const results = [];
    for (const shop of shopsToRun) {
      const result = await runForShop(shop);
      results.push(result);
    }

    const totals = results.reduce(
      (acc, item) => {
        acc.appliedSchedules += item.appliedSchedules;
        acc.appliedVariants += item.appliedVariants;
        acc.revertedSchedules += item.revertedSchedules;
        acc.revertedVariants += item.revertedVariants;
        return acc;
      },
      { appliedSchedules: 0, appliedVariants: 0, revertedSchedules: 0, revertedVariants: 0 }
    );

    return res.status(200).json({
      success: true,
      data: {
        ...totals,
        shopsProcessed: shopsToRun.length,
        byShop: results,
      },
    });
  } catch (error: any) {
    console.error("Error running scheduled changes:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to run scheduled changes" });
  }
}
