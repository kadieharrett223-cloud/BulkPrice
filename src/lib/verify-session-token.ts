import type { NextApiRequest } from "next";
import { shopify } from "@/lib/shopify-config";

type SessionTokenPayload = {
  dest?: string;
  aud?: string;
  exp?: number;
  nbf?: number;
  iss?: string;
  sub?: string;
  sid?: string;
  [key: string]: unknown;
};

function normalizeShopDomain(shop: string): string {
  return shop.trim().toLowerCase();
}

function extractShopFromDest(dest?: string): string | null {
  if (!dest) return null;
  try {
    return new URL(dest).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export async function verifySessionToken(req: NextApiRequest, expectedShop?: string): Promise<SessionTokenPayload | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  let payload: SessionTokenPayload | null = null;
  try {
    payload = (await shopify.session.decodeSessionToken(token)) as unknown as SessionTokenPayload;
  } catch {
    return null;
  }

  if (!payload) return null;

  if (expectedShop) {
    const tokenShop = extractShopFromDest(payload.dest);
    if (!tokenShop) {
      return null;
    }

    if (normalizeShopDomain(tokenShop) !== normalizeShopDomain(expectedShop)) {
      return null;
    }
  }

  return payload;
}
