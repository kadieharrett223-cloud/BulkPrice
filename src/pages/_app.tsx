import "@styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import Navigation from "@components/Navigation";
import DemoBanner from "@components/DemoBanner";
import { ShopifyAppProvider } from "@components/ShopifyAppProvider";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { DEMO_SHOP } from "@lib/mock-data";
import { resolveShop } from "@lib/use-shop";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isBulkPricingPage = router.pathname === "/bulk-pricing";
  const [isDemo, setIsDemo] = useState(false);

  // Save shop parameter to localStorage when available
  useEffect(() => {
    const shop = router.query.shop as string;
    if (shop && typeof window !== "undefined") {
      localStorage.setItem("shopifyShop", shop);
    }
  }, [router.query.shop]);

  // Detect demo mode and seed the fallback demo shop whenever there is no real shop.
  useEffect(() => {
    if (!router.isReady || typeof window === "undefined") return;

    const effectiveShop = resolveShop();
    if (effectiveShop === DEMO_SHOP) {
      localStorage.setItem("shopifyShop", DEMO_SHOP);
      setIsDemo(true);
      sessionStorage.removeItem("shopify-install-warning-shown");
      return;
    }

    setIsDemo(false);
    sessionStorage.removeItem("shopify-install-warning-shown");
  }, [router.isReady, router.query.shop, router.asPath]);

  return (
    <ShopifyAppProvider>
      <div className="min-h-screen bg-gray-50">
        {isDemo && <DemoBanner />}
        <Navigation />
        <main className={isBulkPricingPage ? "" : "container mx-auto py-8"}>
          <Component {...pageProps} />
        </main>
      </div>
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            style: {
              background: "#10b981",
            },
          },
          error: {
            style: {
              background: "#ef4444",
            },
          },
        }}
      />
    </ShopifyAppProvider>
  );
}
