import type { NextApiRequest, NextApiResponse } from "next";
import { getRawBody, validateWebhook } from "@/lib/webhook-utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawBody = await getRawBody(req);
    const isValid = await validateWebhook(req, res, rawBody);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid webhook" });
    }

    const payload = JSON.parse(rawBody || "{}");
    const shop = req.headers["x-shopify-shop-domain"] as string | undefined;

    console.log("customers/data_request webhook received", {
      shop,
      customer: payload?.customer?.id,
      ordersRequested: payload?.orders_requested,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error handling customers/data_request webhook:", error);
    return res.status(500).json({ error: "Failed to process webhook" });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
