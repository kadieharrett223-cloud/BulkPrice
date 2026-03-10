import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { ApiResponse } from "@/types";
import { generateId } from "@lib/price-utils";
import { verifySessionToken } from "@/lib/verify-session-token";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  try {
    const tokenPayload = await verifySessionToken(req);
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (req.method === "GET") {
      return await handleGet(req, res);
    } else if (req.method === "POST" || req.method === "PUT") {
      return await handleSave(req, res);
    } else {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error("Error in settings API:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  const db = await initDb();

  const settings = await db.get("SELECT * FROM settings LIMIT 1");

  if (!settings) {
    return res.status(200).json({
      success: true,
      data: {
        apiKey: "",
        apiPassword: "",
        shop: "",
        plan: "starter",
      },
    });
  }

  // Don't expose full API password
  return res.status(200).json({
    success: true,
    data: {
      apiKey: settings.apiKey,
      apiPassword: settings.apiPassword ? "***" : "",
      shop: settings.shop,
      plan: settings.plan,
    },
  });
}

async function handleSave(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  const db = await initDb();
  const { apiKey, apiPassword, shop, plan } = req.body;

  // Check if settings exist
  const existing = await db.get("SELECT id FROM settings LIMIT 1");

  if (existing) {
    // Update
    await db.run("UPDATE settings SET apiKey = ?, apiPassword = ?, shop = ?, plan = ?, updatedAt = ? WHERE id = ?", [
      apiKey,
      apiPassword,
      shop,
      plan || "starter",
      new Date().toISOString(),
      existing.id,
    ]);
  } else {
    // Create
    const id = generateId("settings");
    await db.run(
      "INSERT INTO settings (id, apiKey, apiPassword, shop, plan, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, apiKey, apiPassword, shop, plan || "starter", new Date().toISOString(), new Date().toISOString()]
    );
  }

  return res.status(200).json({
    success: true,
    data: { shop, plan },
  });
}
