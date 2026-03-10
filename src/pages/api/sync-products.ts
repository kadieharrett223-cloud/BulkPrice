import type { NextApiRequest, NextApiResponse } from "next";
import { initDb } from "@lib/db";
import { ApiResponse } from "@/types";
import { sessionStorage } from "@lib/session-storage";
import { shopify } from "@lib/shopify-config";
import { generateId } from "@lib/price-utils";
import { isDemoShop, getMockProducts, getMockVariants } from "@lib/mock-data";

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

    const db = await initDb();

    // Get session with access token
    const sessionId = shopify.session.getOfflineId(shop);
    const session = await sessionStorage.loadSession(sessionId);

    if (!session?.accessToken) {
      return res.status(401).json({ success: false, error: "Not authenticated. Please complete OAuth first." });
    }

    // Create GraphQL client
    const client = new shopify.clients.Graphql({ session });

    let hasNextPage = true;
    let cursor: string | null = null;
    let totalProducts = 0;
    let totalVariants = 0;

    while (hasNextPage) {
      const query = `
        {
          products(first: 50${cursor ? `, after: "${cursor}"` : ""}) {
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
            }
          }
        }
      `;

      const response: any = await client.query({ data: query });
      const productsData = response.body.data.products;

      for (const edge of productsData.edges) {
        const product = edge.node;
        
        // Extract numeric ID from GraphQL GID
        const productShopifyId = product.id.split("/").pop();
        const productId = generateId("product");

        const collections = product.collections.edges.map((e: any) => e.node.title).join(",");
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
            product.status.toLowerCase(),
            tags,
            collections,
            product.createdAt,
            product.updatedAt,
          ]
        );

        totalProducts++;

        // Get the actual product ID from DB (in case of conflict/update)
        const dbProduct = await db.get("SELECT id FROM products WHERE shopifyId = ? AND shop = ?", [productShopifyId, shop]);
        const actualProductId = dbProduct.id;

        // Insert variants
        for (const variantEdge of product.variants.edges) {
          const variant = variantEdge.node;
          const variantShopifyId = variant.id.split("/").pop();
          const variantId = generateId("variant");

          const options = JSON.stringify(
            variant.selectedOptions.reduce((acc: any, opt: any) => {
              acc[opt.name] = opt.value;
              return acc;
            }, {})
          );

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
              parseFloat(variant.price),
              variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
              variant.sku || "",
              variant.inventoryQuantity || 0,
              options,
              new Date().toISOString(),
              new Date().toISOString(),
            ]
          );

          totalVariants++;
        }
      }

      hasNextPage = productsData.pageInfo.hasNextPage;
      if (hasNextPage && productsData.edges.length > 0) {
        cursor = productsData.edges[productsData.edges.length - 1].cursor;
      }
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
        `Synced ${totalProducts} products with ${totalVariants} variants`,
        totalProducts,
        new Date().toISOString(),
      ]
    );

    return res.status(200).json({
      success: true,
      data: {
        productsSync: totalProducts,
        variantsSync: totalVariants,
        message: "Products synced successfully from Shopify",
      },
    });
  } catch (error: any) {
    console.error("Error syncing products:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to sync products from Shopify" 
    });
  }
}
