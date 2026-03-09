import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { ApiResponse } from "@/types";
import { generateId } from "@lib/price-utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  try {
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
  const { status = "scheduled" } = req.query;

  const changes = await db.all(
    `
    SELECT * FROM scheduledChanges
    WHERE status = ?
    ORDER BY startTime ASC
  `,
    [status]
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
    INSERT INTO scheduledChanges (id, name, description, filters, action, startTime, endTime, autoRevert, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      id,
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
  const { id, status } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: "ID is required" });
  }

  await db.run("UPDATE scheduledChanges SET status = ?, updatedAt = ? WHERE id = ?", [status, new Date().toISOString(), id]);

  return res.status(200).json({ success: true, data: { id, status } });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  const db = await initDb();
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: "ID is required" });
  }

  await db.run("DELETE FROM scheduledChanges WHERE id = ?", [id]);
  await db.run("DELETE FROM scheduledChangeItems WHERE scheduledChangeId = ?", [id]);

  return res.status(200).json({ success: true, data: { id } });
}
