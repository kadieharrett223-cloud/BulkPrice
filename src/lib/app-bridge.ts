/**
 * App Bridge session token utilities.
 * Works with the CDN-hosted App Bridge (window.shopify) loaded in _document.tsx.
 */

let appBridgeAppPromise: Promise<any | null> | null = null;

function resolveApiKey(): string | null {
  if (typeof window === "undefined") return null;

  const fromEnv = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
  if (fromEnv) {
    return fromEnv;
  }

  const fromMeta = document
    .querySelector('meta[name="shopify-api-key"]')
    ?.getAttribute("content")
    ?.trim();

  return fromMeta || null;
}

function resolveHost(): string | null {
  if (typeof window === "undefined") return null;

  const fromQuery = new URLSearchParams(window.location.search).get("host");
  if (fromQuery) {
    localStorage.setItem("shopifyHost", fromQuery);
    return fromQuery;
  }

  const fromStorage = localStorage.getItem("shopifyHost");
  return fromStorage || null;
}

async function getAppBridgeApp(): Promise<any | null> {
  if (typeof window === "undefined") return null;

  if (appBridgeAppPromise) {
    return appBridgeAppPromise;
  }

  appBridgeAppPromise = (async () => {
    const apiKey = resolveApiKey();
    const host = resolveHost();

    if (!apiKey || !host) {
      return null;
    }

    const appBridgeModule = await import("@shopify/app-bridge");
    const createApp = (appBridgeModule as any).default;

    if (!createApp) {
      return null;
    }

    return createApp({ apiKey, host, forceRedirect: false });
  })();

  return appBridgeAppPromise;
}

/**
 * Returns a fresh Shopify session token when running inside Shopify Admin.
 * Returns null when running outside the iframe (demo mode, direct URL access, etc.).
 */
export async function getSessionToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    if (window.shopify?.idToken) {
      const token = await window.shopify.idToken();
      if (token) return token;
    }
  } catch {
    // fall through to npm App Bridge fallback
  }

  try {
    const app = await getAppBridgeApp();
    if (!app) return null;

    const appBridgeUtils = await import("@shopify/app-bridge/utilities");
    const getSessionTokenFromApp = (appBridgeUtils as any).getSessionToken;

    if (!getSessionTokenFromApp) return null;
    return await getSessionTokenFromApp(app);
  } catch {
    return null;
  }
}

/**
 * Builds Authorization headers for fetch / axios requests.
 * Safe to call even when not embedded — returns empty object when no token.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getSessionToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
