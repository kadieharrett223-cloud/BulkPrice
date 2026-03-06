import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Provider as AppBridgeProvider } from "@shopify/app-bridge-react";

interface ShopifyAppProviderProps {
  children: React.ReactNode;
}

export function ShopifyAppProvider({ children }: ShopifyAppProviderProps) {
  const router = useRouter();
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const { shop, host } = router.query;

    if (shop && host && typeof shop === "string" && typeof host === "string") {
      setConfig({
        apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || "",
        host: host,
        forceRedirect: true,
      });
    }
  }, [router.query]);

  if (!config) {
    return <>{children}</>;
  }

  return <AppBridgeProvider config={config}>{children}</AppBridgeProvider>;
}
