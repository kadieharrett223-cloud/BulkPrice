import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="The Perfect Shopify Bulk Price Editor" />
        <meta name="shopify-api-key" content={process.env.SHOPIFY_API_KEY || ""} />
        <link rel="icon" href="/favicon.ico" />
        {/* Shopify App Bridge CDN — required for embedded app checks */}
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
