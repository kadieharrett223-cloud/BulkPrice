import Papa from "papaparse";
import { Variant, Product } from "@/types";

export interface PriceCSVRow {
  "Product ID": string;
  "Product Title": string;
  "Variant ID": string;
  "Variant Title": string;
  "Current Price": number;
  "New Price": number;
  "Compare At Price"?: number;
  SKU?: string;
  Change?: string;
}

export function exportVariantsToCSV(variants: Variant[], products: Map<string, Product>): string {
  const rows: PriceCSVRow[] = variants.map((variant) => {
    const product = products.get(variant.productId);
    return {
      "Product ID": product?.shopifyId || variant.productId,
      "Product Title": product?.title || "Unknown",
      "Variant ID": variant.shopifyId,
      "Variant Title": variant.title,
      "Current Price": variant.price,
      "New Price": variant.price,
      ...(variant.compareAtPrice && { "Compare At Price": variant.compareAtPrice }),
      ...(variant.sku && { SKU: variant.sku }),
    };
  });

  return Papa.unparse(rows);
}

export function exportPreviewToCSV(
  preview: Array<{
    productTitle: string;
    variantTitle: string;
    oldPrice: number;
    newPrice: number;
    oldCompareAtPrice?: number;
    newCompareAtPrice?: number;
    savings?: number;
  }>
): string {
  const rows = preview.map((row) => ({
    "Product": row.productTitle,
    "Variant": row.variantTitle,
    "Old Price": row.oldPrice.toFixed(2),
    "New Price": row.newPrice.toFixed(2),
    "Savings": row.savings ? row.savings.toFixed(2) : "-",
    ...(row.oldCompareAtPrice && { "Old Compare At": row.oldCompareAtPrice.toFixed(2) }),
    ...(row.newCompareAtPrice && { "New Compare At": row.newCompareAtPrice.toFixed(2) }),
  }));

  return Papa.unparse(rows);
}

export function importPricesFromCSV(
  csv: string
): Array<{
  variantId: string;
  newPrice: number;
  newCompareAtPrice?: number;
}> {
  const results = Papa.parse(csv, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  if (results.errors.length > 0) {
    throw new Error(`CSV parsing error: ${results.errors[0].message}`);
  }

  return (results.data as any[]).map((row) => ({
    variantId: row["Variant ID"],
    newPrice: parseFloat(row["New Price"]),
    ...(row["Compare At Price"] && { newCompareAtPrice: parseFloat(row["Compare At Price"]) }),
  }));
}

export function downloadCSV(csv: string, filename: string = "prices.csv"): void {
  const link = document.createElement("a");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = (e) => {
      reject(e);
    };
    reader.readAsText(file);
  });
}
