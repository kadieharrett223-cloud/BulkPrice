import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { ApiResponse } from "@/types";
import {
  DEMO_SHOP,
  isDemoShop,
  getMockCollectionOptions,
  getMockProductTypeOptions,
  getMockVendorOptions,
} from "@lib/mock-data";
import { verifySessionToken } from "@/lib/verify-session-token";

type FilterOptionsResponse = {
  collections: string[];
  vendors: string[];
  productTypes: string[];
};

function splitCsvValues(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<FilterOptionsResponse>>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const shop = typeof req.query.shop === "string" ? req.query.shop : DEMO_SHOP;

    if (isDemoShop(shop)) {
      return res.status(200).json({
        success: true,
        data: {
          collections: getMockCollectionOptions(),
          vendors: getMockVendorOptions(),
          productTypes: getMockProductTypeOptions(),
        },
      });
    }

    const tokenPayload = await verifySessionToken(req, shop);
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const db = await initDb();

    const productRows = await db.all(
      `SELECT collections, vendor, productType FROM products WHERE shop = ?`,
      [shop]
    );

    const collections = uniqueSorted(
      productRows.flatMap((row: any) => splitCsvValues(row.collections))
    );
    const vendors = uniqueSorted(
      productRows
        .map((row: any) => (row.vendor || "").trim())
        .filter(Boolean)
    );
    const productTypes = uniqueSorted(
      productRows
        .map((row: any) => (row.productType || "").trim())
        .filter(Boolean)
    );

    return res.status(200).json({
      success: true,
      data: {
        collections,
        vendors,
        productTypes,
      },
    });
  } catch (error: any) {
    console.error("Error fetching filter options:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch filter options" });
  }
}
