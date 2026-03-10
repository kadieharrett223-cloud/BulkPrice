import React, { useEffect } from "react";
import { useRouter } from "next/router";

declare global {
  interface Window {
    shopify?: {
      idToken: () => Promise<string>;
      config: { apiKey: string; host: string };
    };
  }
}

interface ShopifyAppProviderProps {
  children: React.ReactNode;
}

export function ShopifyAppProvider({ children }: ShopifyAppProviderProps) {
  const router = useRouter();

  useEffect(() => {
    // The CDN App Bridge (loaded via <script> in _document.tsx) auto-initialises
    // window.shopify when embedded inside Shopify Admin. We only need to confirm
    // the apiKey / host are available for any manual usage.
    const { host } = router.query;
    const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;

    if (!apiKey || typeof host !== "string" || !host.trim()) {
      return;
    }

    // CDN App Bridge auto-configures from window.shopify; nothing more to do.
    if (typeof window !== "undefined" && window.shopify) {
      // App Bridge is ready via CDN
      console.debug("[AppBridge] CDN App Bridge ready");
    }
  }, [router.query]);

  return <>{children}</>;
}
