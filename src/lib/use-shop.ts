import { useEffect, useState } from "react";
import { DEMO_SHOP } from "@lib/mock-data";

/**
 * Returns the active shop identifier.
 *
 * Priority:
 *  1. `?shop=` URL query param  (real install)
 *  2. `shopifyShop` localStorage key  (real install, persisted)
 *  3. `DEMO_SHOP` constant as a public demo fallback when no real shop exists
 */
export function resolveShop(): string {
  if (typeof window === "undefined") return "";
  const urlParams = new URLSearchParams(window.location.search);
  const fromUrl = urlParams.get("shop");
  if (fromUrl) {
    // Persist for subsequent page loads
    localStorage.setItem("shopifyShop", fromUrl);
    return fromUrl;
  }
  const fromStorage = localStorage.getItem("shopifyShop");
  if (fromStorage) return fromStorage;

  return DEMO_SHOP;
}

/** React hook wrapping resolveShop – handles SSR gracefully */
export function useShop(): { shop: string; isDemo: boolean } {
  const [shop, setShop] = useState("");

  useEffect(() => {
    setShop(resolveShop());
  }, []);

  return { shop, isDemo: shop === DEMO_SHOP };
}
