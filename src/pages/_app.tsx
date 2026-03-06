import "@styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import Navigation from "@components/Navigation";
import { ShopifyAppProvider } from "@components/ShopifyAppProvider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ShopifyAppProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto py-8">
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
