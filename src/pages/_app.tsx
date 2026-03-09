import "@styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import Navigation from "@components/Navigation";
import { ShopifyAppProvider } from "@components/ShopifyAppProvider";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isBulkPricingPage = router.pathname === "/bulk-pricing";

  // Save shop parameter to localStorage when available
  useEffect(() => {
    const shop = router.query.shop as string;
    if (shop && typeof window !== "undefined") {
      localStorage.setItem("shopifyShop", shop);
    }
  }, [router.query.shop]);

  // Show a clear notification when app is opened without Shopify install context
  useEffect(() => {
    if (!router.isReady || typeof window === "undefined") {
      return;
    }

    const urlShop = typeof router.query.shop === "string" ? router.query.shop : "";
    const storedShop = localStorage.getItem("shopifyShop") || "";
    const hasShopContext = Boolean(urlShop || storedShop);

    if (hasShopContext) {
      sessionStorage.removeItem("shopify-install-warning-shown");
      return;
    }

    if (!sessionStorage.getItem("shopify-install-warning-shown")) {
      toast.error("Install on Shopify to start");
      sessionStorage.setItem("shopify-install-warning-shown", "1");
    }
  }, [router.isReady, router.query.shop]);

  return (
    <ShopifyAppProvider>
      <div className="min-h-screen bg-gray-50">
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
