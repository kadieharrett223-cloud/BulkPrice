import { NextApiRequest, NextApiResponse } from "next";
import { createRecurringCharge, checkSubscriptionStatus, BILLING_PLANS } from "@/lib/billing";
import { sessionStorage } from "@/lib/session-storage";
import { shopify } from "@/lib/shopify-config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { shop } = req.query;

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({ error: "Missing shop parameter" });
    }

    // Get session
    const sessions = await sessionStorage.findSessionsByShop(shop);
    const session = sessions[0];

    if (!session) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (req.method === "GET") {
      // Check current subscription status
      const status = await checkSubscriptionStatus(session);
      return res.json({ success: true, ...status, plans: BILLING_PLANS });
    }

    if (req.method === "POST") {
      // Create new subscription
      const { plan } = req.body;

      if (!plan || !BILLING_PLANS[plan]) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const confirmationUrl = await createRecurringCharge(session, plan);

      return res.json({
        success: true,
        confirmationUrl,
        message: "Redirect customer to confirmation URL",
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Billing API error:", error);
    res.status(500).json({ error: "Failed to process billing request" });
  }
}
