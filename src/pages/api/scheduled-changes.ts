import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { ApiResponse } from "@/types";
import { generateId } from "@lib/price-utils";
import { DEMO_SHOP, isDemoShop, MOCK_SCHEDULED_CHANGES } from "@lib/mock-data";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  try {
    // ── Demo mode ──────────────────────────────────────────────────────────────
    const shop = ((req.query.shop || req.body?.shop) as string | undefined) || DEMO_SHOP;
    if (isDemoShop(shop)) {
      if (req.method === "GET") {
        const { status = "scheduled" } = req.query;
        const filtered = status === "all"
          ? MOCK_SCHEDULED_CHANGES
          : MOCK_SCHEDULED_CHANGES.filter((c) => c.status === status);
        const result = filtered.map((c) => ({
          ...c,
          filters: JSON.parse(c.filters),
          action: JSON.parse(c.action),
        }));
        return res.status(200).json({ success: true, data: result });
      }
      if (req.method === "POST") {
        return res.status(200).json({
          success: true,
          data: { id: `mock-sched-${Date.now()}`, ...req.body, status: "scheduled" },
        });
      }
      if (req.method === "PUT" || req.method === "DELETE") {
        return res.status(200).json({ success: true, data: {} });
      }
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    // Real Shopify store routing
    if (req.method === "GET") {
      return await handleGet(req, res);
    } else if (req.method === "POST") {
      return await handlePost(req, res);
    } else if (req.method === "PUT") {
      return await handlePut(req, res);
    } else if (req.method === "DELETE") {
      return await handleDelete(req, res);
    } else {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error("Error in scheduled changes API:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  const db = await initDb();
  const { status = "scheduled", shop } = req.query;

  if (!shop || typeof shop !== "string") {
    return res.status(400).json({ success: false, error: "Shop parameter required" });
  }

  const changes = status === "all"
    ? await db.all(
        `
        SELECT * FROM scheduledChanges
        WHERE shop = ?
        ORDER BY startTime ASC
      `,
        [shop]
      )
    : await db.all(
        `
        SELECT * FROM scheduledChanges
        WHERE status = ? AND shop = ?
        ORDER BY startTime ASC
      `,
        [status, shop]
      );

  const result = changes.map((change: any) => ({
    ...change,
    filters: JSON.parse(change.filters),
    action: JSON.parse(change.action),
  }));

  return res.status(200).json({ success: true, data: result });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  const db = await initDb();
  const { name, description, filters, action, startTime, endTime, autoRevert, shop } = req.body;

  if (!shop) {
    return res.status(400).json({ success: false, error: "Shop parameter required" });
  }

  const settings = await db.get("SELECT plan FROM settings WHERE shop = ? LIMIT 1", [shop]);
  const rawPlan = (settings?.plan || "starter") as string;
  const normalizedPlan =
    rawPlan === "basic"
      ? "starter"
      : rawPlan === "pro" || rawPlan === "advanced"
      ? "premium"
      : rawPlan;

  if (normalizedPlan !== "premium") {
    return res.status(402).json({
      success: false,
      error: "Upgrade to Premium to pre-schedule sales and add calendar tasks.",
    });
  }

  const id = generateId("scheduled");
  const now = new Date().toISOString();

  await db.run(
    `
    INSERT INTO scheduledChanges (id, shop, name, description, filters, action, startTime, endTime, autoRevert, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      id,
      shop,
      name,
      description,
      JSON.stringify(filters),
      JSON.stringify(action),
      startTime,
      endTime,
      autoRevert ? 1 : 0,
      "scheduled",
      now,
      now,
    ]
  );

  return res.status(201).json({
    success: true,
    data: { id },
  });
}

async function handlePut(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  const db = await initDb();
  const { id, status, name, description, filters, action, startTime, endTime, autoRevert, shop } = req.body;

  if (!id || !shop) {
    return res.status(400).json({ success: false, error: "ID and shop are required" });
  }

  if (typeof name === "string" || typeof description === "string" || filters || action || startTime || endTime || typeof autoRevert === "boolean") {
    const settings = await db.get("SELECT plan FROM settings WHERE shop = ? LIMIT 1", [shop]);
    const rawPlan = (settings?.plan || "starter") as string;
    const normalizedPlan =
      rawPlan === "basic"
        ? "starter"
        : rawPlan === "pro" || rawPlan === "advanced"
        ? "premium"
        : rawPlan;

    if (normalizedPlan !== "premium") {
      return res.status(402).json({
        success: false,
        error: "Upgrade to Premium to edit scheduled sales.",
      });
    }

    await db.run(
      `
      UPDATE scheduledChanges
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          filters = COALESCE(?, filters),
          action = COALESCE(?, action),
          startTime = COALESCE(?, startTime),
          endTime = COALESCE(?, endTime),
          autoRevert = COALESCE(?, autoRevert),
          updatedAt = ?
      WHERE id = ? AND shop = ?
    `,
      [
        typeof name === "string" ? name : null,
        typeof description === "string" ? description : null,
        filters ? JSON.stringify(filters) : null,
        action ? JSON.stringify(action) : null,
        startTime || null,
        endTime || null,
        typeof autoRevert === "boolean" ? (autoRevert ? 1 : 0) : null,
        new Date().toISOString(),
        id,
        shop,
      ]
    );

    return res.status(200).json({ success: true, data: { id } });
  }

  await db.run("UPDATE scheduledChanges SET status = ?, updatedAt = ? WHERE id = ? AND shop = ?", [status, new Date().toISOString(), id, shop]);

  return res.status(200).json({ success: true, data: { id, status } });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  const db = await initDb();
  const { id, shop } = req.query;

  if (!id || !shop || typeof shop !== "string") {
    return res.status(400).json({ success: false, error: "ID and shop are required" });
  }

  await db.run("DELETE FROM scheduledChanges WHERE id = ? AND shop = ?", [id, shop]);
  await db.run("DELETE FROM scheduledChangeItems WHERE scheduledChangeId = ? AND shop = ?", [id, shop]);

  return res.status(200).json({ success: true, data: { id } });
}
