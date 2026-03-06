import { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify-config";
import { sessionStorage } from "@/lib/session-storage";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const { session } = callbackResponse;

    if (!session) {
      return res.status(400).json({ error: "No session created" });
    }

    // Store session in database
    await sessionStorage.storeSession(session);

    // Redirect to app after successful authentication
    const host = req.query.host as string;
    const redirectUrl = `/?shop=${session.shop}&host=${host}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    res.status(500).json({ error: "Failed to complete OAuth flow" });
  }
}
