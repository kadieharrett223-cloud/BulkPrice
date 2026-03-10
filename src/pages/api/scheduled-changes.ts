import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { ApiResponse } from "@/types";
import { generateId } from "@lib/price-utils";
import { verifySessionToken } from "@/lib/verify-session-token";
import {
  DEMO_SHOP,
  addMockScheduledChange,
  deleteMockScheduledChange,
  getMockScheduledChanges,
  isDemoShop,
  updateMockScheduledChange,
} from "@lib/mock-data";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  try {
    // ── Demo mode ──────────────────────────────────────────────────────────────
    const shop = ((req.query.shop || req.body?.shop) as string | undefined) || DEMO_SHOP;
    if (isDemoShop(shop)) {
      if (req.method === "GET") {
        const { status = "scheduled" } = req.query;
        const allChanges = getMockScheduledChanges();
        const filtered = status === "all"
          ? allChanges
          : allChanges.filter((c) => c.status === status);
        const result = filtered.map((c) => ({
          ...c,
          filters: JSON.parse(c.filters),
          action: JSON.parse(c.action),
        }));
        return res.status(200).json({ success: true, data: result });
      }
      if (req.method === "POST") {
        const id = generateId("mock-sched");
        const now = new Date().toISOString();
        const created = addMockScheduledChange({
          id,
          shop,
          name: req.body?.name || "Untitled Schedule",
          description: req.body?.description || "",
          filters: JSON.stringify(req.body?.filters || {}),
          action: JSON.stringify(req.body?.action || {}),
          startTime: req.body?.startTime || now,
          endTime: req.body?.endTime || null,
          autoRevert: Boolean(req.body?.autoRevert),
          status: "scheduled",
          createdAt: now,
        });

        return res.status(200).json({
          success: true,
          data: {
            ...created,
            filters: JSON.parse(created.filters),
            action: JSON.parse(created.action),
          },
        });
      }
      if (req.method === "PUT") {
        const id = req.body?.id as string;
        if (!id) {
          return res.status(400).json({ success: false, error: "ID is required" });
        }

        const updated = updateMockScheduledChange(id, (current) => ({
          ...current,
          name: typeof req.body?.name === "string" ? req.body.name : current.name,
          description: typeof req.body?.description === "string" ? req.body.description : current.description,
          filters: req.body?.filters ? JSON.stringify(req.body.filters) : current.filters,
          action: req.body?.action ? JSON.stringify(req.body.action) : current.action,
          startTime: req.body?.startTime || current.startTime,
          endTime: req.body?.endTime ?? current.endTime,
          autoRevert: typeof req.body?.autoRevert === "boolean" ? req.body.autoRevert : current.autoRevert,
          status: req.body?.status || current.status,
          createdAt: current.createdAt,
        }));

        if (!updated) {
          return res.status(404).json({ success: false, error: "Schedule not found" });
        }

        return res.status(200).json({
          success: true,
          data: {
            ...updated,
            filters: JSON.parse(updated.filters),
            action: JSON.parse(updated.action),
          },
        });
      }
      if (req.method === "DELETE") {
        const id = (req.query.id as string | undefined) || req.body?.id;
        if (!id) {
          return res.status(400).json({ success: false, error: "ID is required" });
        }

        const deleted = deleteMockScheduledChange(id);
        return res.status(200).json({ success: deleted, data: { id } });
      }
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const tokenPayload = await verifySessionToken(req, shop);
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
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
