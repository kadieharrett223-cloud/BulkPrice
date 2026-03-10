/**
 * App Bridge session token utilities.
 * Works with the CDN-hosted App Bridge (window.shopify) loaded in _document.tsx.
 */

/**
 * Returns a fresh Shopify session token when running inside Shopify Admin.
 * Returns null when running outside the iframe (demo mode, direct URL access, etc.).
 */
export async function getSessionToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!window.shopify?.idToken) return null;

  try {
    return await window.shopify.idToken();
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
