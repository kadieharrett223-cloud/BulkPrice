import axios from "axios";
import { ShopifyProduct, ShopifyVariant } from "@/types";

export class ShopifyAPI {
  private apiKey: string;
  private apiPassword: string;
  private shop: string;
  private apiClient: any;

  constructor(apiKey: string, apiPassword: string, shop: string) {
    this.apiKey = apiKey;
    this.apiPassword = apiPassword;
    this.shop = shop;

    this.apiClient = axios.create({
      baseURL: `https://${shop}/admin/api/2024-01`,
      auth: {
        username: apiKey,
        password: apiPassword,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async getProducts(
    limit: number = 250,
    status: "active" | "archived" | "draft" = "active",
    cursor?: string
  ): Promise<{ products: ShopifyProduct[]; nextCursor?: string }> {
    try {
      const query = new URLSearchParams({
        limit: limit.toString(),
        status,
        ...(cursor && { after: cursor }),
      });

      const response = await this.apiClient.get(`/graphql.json`, {
        data: this.buildGraphQLQuery("listProducts", limit, cursor),
      });

      // Handle both REST and GraphQL responses
      if (response.data.data) {
        // GraphQL response
        const products = response.data.data.products.edges.map((edge: any) => edge.node);
        const pageInfo = response.data.data.products.pageInfo;
        return {
          products,
          nextCursor: pageInfo.hasNextPage ? pageInfo.endCursor : undefined,
        };
      }

      return {
        products: response.data.products || [],
        nextCursor: undefined,
      };
    } catch (error) {
      console.error("Error fetching products from Shopify:", error);
      throw error;
    }
  }

  async getProduct(id: string): Promise<ShopifyProduct> {
    try {
      const response = await this.apiClient.get(`/products/${id}.json`);
      return response.data.product;
    } catch (error) {
      console.error("Error fetching product:", error);
      throw error;
    }
  }

  async updateVariantPrice(variantId: string, price: number, compareAtPrice?: number): Promise<ShopifyVariant> {
    try {
      const data: any = { price: price.toString() };
      if (compareAtPrice !== undefined) {
        data.compare_at_price = compareAtPrice.toString();
      }

      const response = await this.apiClient.put(`/variants/${variantId}.json`, {
        variant: data,
      });

      return response.data.variant;
    } catch (error) {
      console.error("Error updating variant price:", error);
      throw error;
    }
  }

  async createBulkOperation(operation: string): Promise<string> {
    try {
      // Simplified bulk operation - in real implementation, use Shopify's GraphQL admin API
      const response = await this.apiClient.post(`/graphql.json`, {
        query: operation,
      });

      return response.data.data?.bulkOperationCreate?.bulkOperation?.id || "";
    } catch (error) {
      console.error("Error creating bulk operation:", error);
      throw error;
    }
  }

  async getBulkOperationStatus(operationId: string): Promise<string> {
    try {
      const response = await this.apiClient.get(`/graphql.json`, {
        data: `query { node(id: "${operationId}") { ... on BulkOperation { status } } }`,
      });

      return response.data.data?.node?.status || "UNKNOWN";
    } catch (error) {
      console.error("Error getting bulk operation status:", error);
      throw error;
    }
  }

  private buildGraphQLQuery(type: string, limit: number, cursor?: string): string {
    if (type === "listProducts") {
      const afterCursor = cursor ? `, after: "${cursor}"` : "";
      return `
        query {
          products(first: ${limit}${afterCursor}) {
            edges {
              node {
                id
                title
                vendor
                productType
                tags
                collections(first: 10) {
                  edges {
                    node {
                      title
                    }
                  }
                }
                variants(first: 250) {
                  edges {
                    node {
                      id
                      title
                      price
                      compareAtPrice
                      sku
                      inventoryQuantity
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;
    }

    return "";
  }
}

export function createShopifyAPI(apiKey: string, apiPassword: string, shop: string): ShopifyAPI {
  return new ShopifyAPI(apiKey, apiPassword, shop);
}
