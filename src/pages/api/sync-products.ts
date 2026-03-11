import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { ApiResponse } from "@/types";
import { generateId } from "@lib/price-utils";
import { isDemoShop, getMockProducts, getMockVariants } from "@lib/mock-data";
import { verifySessionToken } from "@/lib/verify-session-token";

function extractShopifyId(gid: string | undefined): string {
  if (!gid || typeof gid !== "string") return "";
  const value = gid.split("/").pop() || "";
  return value.trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { shop } = req.body;

    if (!shop) {
      return res.status(400).json({ success: false, error: "Shop parameter required" });
    }

    // ── Demo mode: pretend sync succeeded with mock counts ─────────────────────
    if (isDemoShop(shop)) {
      const products = getMockProducts();
      const variants = getMockVariants();
      return res.status(200).json({
        success: true,
        data: {
          productsSync: products.length,
          variantsSync: variants.length,
          message: "Demo sync complete – mock data loaded",
        },
      });
    }

    const tokenPayload = await verifySessionToken(req, shop);
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const db = await initDb();
    const [{ sessionStorage }, { shopify }] = await Promise.all([
      import("@lib/session-storage"),
      import("@lib/shopify-config"),
    ]);

    // Get session with access token
    const sessionId = shopify.session.getOfflineId(shop);
    const session = await sessionStorage.loadSession(sessionId);

    if (!session?.accessToken) {
      return res.status(401).json({ success: false, error: "Not authenticated. Please complete OAuth first." });
    }

    if (!session.shop || session.shop.toLowerCase() !== shop.toLowerCase()) {
      return res.status(401).json({ success: false, error: "Session shop mismatch. Please re-authenticate." });
    }

    // Create GraphQL client
    const client = new shopify.clients.Graphql({ session });

    let hasNextPage = true;
    let cursor: string | null = null;
    let totalProducts = 0;
    let totalVariants = 0;
    let failedProducts = 0;
    let failedVariants = 0;

    while (hasNextPage) {
      const query = `
        query SyncProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            edges {
              node {
                id
                title
                vendor
                productType
                status
                tags
                collections(first: 10) {
                  edges {
                    node {
                      title
                    }
                  }
                }
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      price
                      compareAtPrice
                      sku
                      inventoryQuantity
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
                createdAt
                updatedAt
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const response: any = await client.request(query, {
        variables: {
          first: 50,
          after: cursor,
        },
      });

      const graphqlErrors = response?.errors || response?.body?.errors;
      if (Array.isArray(graphqlErrors) && graphqlErrors.length > 0) {
        const errorMessage = graphqlErrors.map((e: any) => e?.message).filter(Boolean).join("; ") || "Shopify GraphQL error";
        return res.status(502).json({ success: false, error: errorMessage });
      }

      const productsData = response?.data?.products || response?.body?.data?.products;
      if (!productsData || !Array.isArray(productsData.edges) || !productsData.pageInfo) {
        return res.status(502).json({
          success: false,
          error: "Invalid Shopify response while syncing products",
        });
      }

      for (const edge of productsData.edges) {
        try {
          const product = edge.node;
          if (!product?.id) continue;

          // Extract numeric ID from GraphQL GID
          const productShopifyId = extractShopifyId(product.id);
          if (!productShopifyId) continue;
          const productId = generateId("product");

          const collections = Array.isArray(product.collections?.edges)
            ? product.collections.edges.map((e: any) => e?.node?.title).filter(Boolean).join(",")
            : "";
          const tags = Array.isArray(product.tags) ? product.tags.join(",") : product.tags || "";

          // Insert or update product
          await db.run(
            `INSERT INTO products (id, shop, shopifyId, title, vendor, productType, status, tags, collections, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(shopifyId) DO UPDATE SET
               shop = excluded.shop,
               title = excluded.title,
               vendor = excluded.vendor,
               productType = excluded.productType,
               status = excluded.status,
               tags = excluded.tags,
               collections = excluded.collections,
               updatedAt = excluded.updatedAt`,
            [
              productId,
              shop,
              productShopifyId,
              product.title,
              product.vendor || "",
              product.productType || "",
              typeof product.status === "string" ? product.status.toLowerCase() : "active",
              tags,
              collections,
              product.createdAt,
              product.updatedAt,
            ]
          );

          totalProducts++;

          // Get the actual product ID from DB (in case of conflict/update)
          const dbProduct = await db.get("SELECT id FROM products WHERE shopifyId = ? AND shop = ?", [productShopifyId, shop]);
          if (!dbProduct?.id) {
            continue;
          }
          const actualProductId = dbProduct.id;

          // Insert variants
          const variantEdges = Array.isArray(product.variants?.edges) ? product.variants.edges : [];
          for (const variantEdge of variantEdges) {
            try {
              const variant = variantEdge.node;
              if (!variant?.id) continue;

              const variantShopifyId = extractShopifyId(variant.id);
              if (!variantShopifyId) continue;
              const variantId = generateId("variant");

              const options = JSON.stringify(
                (Array.isArray(variant.selectedOptions) ? variant.selectedOptions : []).reduce((acc: any, opt: any) => {
                  if (!opt?.name) return acc;
                  acc[opt.name] = opt.value;
                  return acc;
                }, {})
              );

              const parsedPrice = Number.parseFloat(variant.price);
              if (!Number.isFinite(parsedPrice)) {
                failedVariants++;
                continue;
              }

              const parsedCompareAtPrice = Number.parseFloat(variant.compareAtPrice);
              const compareAtPrice = Number.isFinite(parsedCompareAtPrice) ? parsedCompareAtPrice : null;

              await db.run(
                `INSERT INTO variants (id, shop, shopifyId, productId, title, price, compareAtPrice, sku, inventory, options, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(shopifyId) DO UPDATE SET
                   shop = excluded.shop,
                   productId = excluded.productId,
                   title = excluded.title,
                   price = excluded.price,
                   compareAtPrice = excluded.compareAtPrice,
                   sku = excluded.sku,
                   inventory = excluded.inventory,
                   options = excluded.options,
                   updatedAt = excluded.updatedAt`,
                [
                  variantId,
                  shop,
                  variantShopifyId,
                  actualProductId,
                  variant.title,
                  parsedPrice,
                  compareAtPrice,
                  variant.sku || "",
                  Number.isFinite(Number(variant.inventoryQuantity)) ? Number(variant.inventoryQuantity) : 0,
                  options,
                  new Date().toISOString(),
                  new Date().toISOString(),
                ]
              );

              totalVariants++;
            } catch (variantError) {
              failedVariants++;
              console.warn("Skipping variant during sync due to data/runtime error:", variantError);
            }
          }
        } catch (productError) {
          failedProducts++;
          console.warn("Skipping product during sync due to data/runtime error:", productError);
        }
      }

      hasNextPage = Boolean(productsData.pageInfo.hasNextPage);
      cursor = hasNextPage ? productsData.pageInfo.endCursor || null : null;
    }

    // Log activity
    const logId = generateId("log");
    await db.run(
      `INSERT INTO activityLog (id, shop, action, details, affectedCount, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        logId,
        shop,
        "Product sync completed",
        `Synced ${totalProducts} products with ${totalVariants} variants (${failedProducts} products skipped, ${failedVariants} variants skipped)`,
        totalProducts,
        new Date().toISOString(),
      ]
    );

    if (totalProducts === 0 && failedProducts > 0) {
      return res.status(502).json({
        success: false,
        error: "Shopify data could not be processed. Please retry sync.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        productsSync: totalProducts,
        variantsSync: totalVariants,
        failedProducts,
        failedVariants,
        message:
          failedProducts > 0 || failedVariants > 0
            ? "Products synced with some records skipped due to invalid data"
            : "Products synced successfully from Shopify",
      },
    });
  } catch (error: any) {
    console.error("Error syncing products:", error);

    const message = String(error?.message || "");
    if (message.includes("401") || message.includes("403") || message.toLowerCase().includes("access denied")) {
      return res.status(401).json({
        success: false,
        error: "Shopify API authentication failed. Please re-install or re-authenticate the app.",
      });
    }

    return res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to sync products from Shopify" 
    });
  }
}
