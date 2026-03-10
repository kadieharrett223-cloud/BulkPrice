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
  const url = config.url || "";

  // Only intercept same-origin API calls
  if (!url.startsWith("/api/")) {
    return config;
  }

  // Never block auth bootstrap calls on App Bridge token retrieval.
  if (url.startsWith("/api/auth/status") || url.startsWith("/api/auth")) {
    return config;
  }

  try {
    const token = await Promise.race<string | null>([
      getSessionToken(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);

    if (token) {
      config.headers = config.headers ?? {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // If token retrieval fails, continue request without Authorization header.
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

  const redirectToAuth = (shop: string) => {
    if (typeof window === "undefined") return;

    const key = `shopify-reauth-${shop}`;
    const lastAttempt = Number(sessionStorage.getItem(key) || "0");
    const now = Date.now();

    if (now - lastAttempt < 4000) {
      return;
    }

    sessionStorage.setItem(key, String(now));

    // Forward host + embedded so /api/auth can detect iframe context and break out.
    const urlParams = new URLSearchParams(window.location.search);
    const host = urlParams.get("host");
    const isEmbedded = Boolean(host) || urlParams.get("embedded") === "1";

    const authParams = new URLSearchParams({ shop });
    if (host) authParams.set("host", host);
    if (isEmbedded) authParams.set("embedded", "1");

    window.location.href = `/api/auth?${authParams.toString()}`;
  };

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
          redirectToAuth(shopFromUrl);
          return;
        }
      } catch (error) {
        console.error("Error verifying auth status:", error);

        if (axios.isAxiosError(error) && error.response?.status === 401) {
          redirectToAuth(shopFromUrl);
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
