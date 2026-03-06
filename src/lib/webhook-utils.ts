import type { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify-config";

export async function getRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function validateWebhook(
  req: NextApiRequest,
  res: NextApiResponse,
  rawBody: string
): Promise<boolean> {
  const validation = await shopify.webhooks.validate({
    rawBody,
    rawRequest: req,
    rawResponse: res,
  });

  if (typeof validation === "boolean") {
    return validation;
  }

  const normalized = validation as { valid?: boolean; isValid?: boolean };
  return normalized.valid ?? normalized.isValid ?? false;
}
