import { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify-config";
import { sessionStorage } from "@/lib/session-storage";

export async function verifyRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) {
  try {
    const sessionId = await shopify.session.getCurrentId({
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    if (!sessionId) {
      return res.status(401).json({ error: "Unauthorized - No session" });
    }

    const session = await sessionStorage.loadSession(sessionId);

    if (!session) {
      return res.status(401).json({ error: "Unauthorized - Session not found" });
    }

    // Attach session to request for use in API routes
    (req as any).session = session;

    next();
  } catch (error) {
    console.error("Error verifying request:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
}
