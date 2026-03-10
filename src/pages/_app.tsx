import "@styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import Navigation from "@components/Navigation";
import DemoBanner from "@components/DemoBanner";
import { ShopifyAppProvider } from "@components/ShopifyAppProvider";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { DEMO_SHOP } from "@lib/mock-data";
import { resolveShop } from "@lib/use-shop";
import axios from "axios";
import { getSessionToken } from "@lib/app-bridge";

// Attach Shopify session token to every internal API request when embedded.
axios.interceptors.request.use(async (config) => {
  // Only intercept same-origin API calls
  if (config.url?.startsWith("/api/")) {
    const token = await getSessionToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

const PUBLIC_RESOURCE_ROUTES = new Set([
  "/privacy",
  "/faq",
  "/tutorial",
  "/docs",
  "/pricing",
  "/changelog",
  "/tutorial-video-internal",
]);

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isBulkPricingPage = router.pathname === "/bulk-pricing";
  const isPublicResourcePage = PUBLIC_RESOURCE_ROUTES.has(router.pathname);
  const [isDemo, setIsDemo] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

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

  useEffect(() => {
    if (!router.isReady || typeof window === "undefined") {
      return;
    }

    if (isPublicResourcePage) {
      setCheckingAuth(false);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const shopFromUrl = urlParams.get("shop") || (typeof router.query.shop === "string" ? router.query.shop : "");
    const hostFromUrl = urlParams.get("host") || (typeof router.query.host === "string" ? router.query.host : "");
    const isEmbeddedContext = Boolean(hostFromUrl);

    if (!shopFromUrl || shopFromUrl === DEMO_SHOP) {
      setCheckingAuth(false);
      return;
    }

    const isAuthRoute = router.pathname.startsWith("/api/auth");
    if (isAuthRoute) {
      setCheckingAuth(false);
      return;
    }

    const verifyAndAuthenticate = async () => {
      try {
        const response = await axios.get(`/api/auth/status?shop=${encodeURIComponent(shopFromUrl)}`);
        const authenticated = Boolean(response.data?.data?.authenticated);

        if (!authenticated) {
          if (!isEmbeddedContext) {
            window.location.href = `/api/auth?shop=${encodeURIComponent(shopFromUrl)}`;
            return;
          }

          setCheckingAuth(false);
          return;
        }
      } catch (error) {
        console.error("Error verifying auth status:", error);

        if (axios.isAxiosError(error) && error.response?.status === 401 && !isEmbeddedContext) {
          window.location.href = `/api/auth?shop=${encodeURIComponent(shopFromUrl)}`;
          return;
        }

        setCheckingAuth(false);
        return;
      }

      setCheckingAuth(false);
    };

    verifyAndAuthenticate();
  }, [router.isReady, router.pathname, isPublicResourcePage]);

  if (checkingAuth && !isPublicResourcePage) {
    return (
      <ShopifyAppProvider>
        <div className="min-h-screen flex items-center justify-center text-gray-600">
          Checking store authentication...
        </div>
      </ShopifyAppProvider>
    );
  }

  return (
    <ShopifyAppProvider>
      <div className="min-h-screen">
        {!isPublicResourcePage && isDemo && <DemoBanner />}
        {!isPublicResourcePage && <Navigation />}
        <main className={isPublicResourcePage ? "" : isBulkPricingPage ? "" : "w-full max-w-[1400px] mx-auto px-6 py-8"}>
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
