import { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify-config";
import { sessionStorage } from "@/lib/session-storage";

const OAUTH_HOST_COOKIE = "shopify_oauth_host";

function readCookie(req: NextApiRequest, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;

  const parts = header.split(";");
  for (const part of parts) {
    const [rawKey, ...rawValueParts] = part.trim().split("=");
    if (rawKey !== name) continue;
    const rawValue = rawValueParts.join("=");
    if (!rawValue) return null;
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

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
    const stored = await sessionStorage.storeSession(session);
    if (!stored) {
      console.error("Failed to persist Shopify session after OAuth callback", { shop: session.shop, sessionId: session.id });
      return res.status(500).json({ error: "Failed to persist OAuth session" });
    }

    // Redirect to app after successful authentication
    const hostFromQuery = typeof req.query.host === "string" ? req.query.host : "";
    const hostFromCookie = readCookie(req, OAUTH_HOST_COOKIE) || "";
    const host = hostFromQuery || hostFromCookie;
    const query = new URLSearchParams({ shop: session.shop });
    if (host) {
      query.set("host", host);
    }
    const redirectUrl = `/?${query.toString()}`;

    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader(
      "Set-Cookie",
      `${OAUTH_HOST_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,
    );

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    res.status(500).json({ error: "Failed to complete OAuth flow" });
  }
}
