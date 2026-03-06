import React, { useEffect } from "react";
import { useRouter } from "next/router";
import createApp from "@shopify/app-bridge";

interface ShopifyAppProviderProps {
  children: React.ReactNode;
}

export function ShopifyAppProvider({ children }: ShopifyAppProviderProps) {
  const router = useRouter();

  useEffect(() => {
    const { host } = router.query;
    const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;

    if (!apiKey || typeof host !== "string" || !host.trim()) {
      return;
    }

    try {
      createApp({
        apiKey,
        host,
        forceRedirect: true,
      });
    } catch (error) {
      console.error("Failed to initialize Shopify App Bridge:", error);
    }
  }, [router.query]);

  return <>{children}</>;
}
