import type { NextApiRequest, NextApiResponse } from "next";
import { sessionStorage } from "@/lib/session-storage";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
      data: { authenticated: false },
    });
  }

  try {
    const { shop } = req.query;

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({
        success: false,
        error: "Missing shop parameter",
        data: { authenticated: false },
      });
    }

    const sessions = await sessionStorage.findSessionsByShop(shop);
    const hasValidSession = sessions.some((session) => Boolean(session.accessToken));

    if (!hasValidSession) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
        data: {
          authenticated: false,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        authenticated: true,
      },
    });
  } catch (error: any) {
    console.error("Error checking auth status:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to check auth status",
      data: { authenticated: false },
    });
  }
}
