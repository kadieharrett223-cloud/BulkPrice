import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import createApp from "@shopify/app-bridge";

interface ShopifyAppProviderProps {
  children: React.ReactNode;
}

export function ShopifyAppProvider({ children }: ShopifyAppProviderProps) {
  const router = useRouter();
  const [appBridge, setAppBridge] = useState<any>(null);

  useEffect(() => {
    const { shop, host } = router.query;

    if (shop && host && typeof shop === "string" && typeof host === "string") {
      const config = {
        apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || "",
        host: host,
        forceRedirect: true,
      };

      const app = createApp(config);
      setAppBridge(app);
    }
  }, [router.query]);

  return <>{children}</>;
}
