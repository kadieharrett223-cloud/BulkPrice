import { PriceAction } from "@/types";

export function calculateNewPrice(currentPrice: number, action: PriceAction): number {
  switch (action.type) {
    case "percentage_increase":
      return Math.round((currentPrice * (1 + (action.value || 0) / 100)) * 100) / 100;
    case "percentage_decrease":
      return Math.round((currentPrice * (1 - (action.value || 0) / 100)) * 100) / 100;
    case "fixed_increase":
      return Math.round((currentPrice + (action.value || 0)) * 100) / 100;
    case "fixed_decrease":
      return Math.round((currentPrice - (action.value || 0)) * 100) / 100;
    case "exact":
      return action.value || currentPrice;
    case "round":
      return roundPrice(currentPrice, action.roundTo || ".99");
    default:
      return currentPrice;
  }
}

export function applyMarginProtection(
  calculatedPrice: number,
  currentPrice: number,
  action: PriceAction,
  variantCost?: number | null
): { price: number; wasProtected: boolean; floor?: number } {
  const protection = action.marginProtection;

  if (!protection?.enabled) {
    return { price: calculatedPrice, wasProtected: false };
  }

  let floor: number | null = null;

  if (protection.mode === "fixed_minimum") {
    floor = protection.value;
  } else {
    const hasCost = typeof variantCost === "number" && !Number.isNaN(variantCost);
    if (!hasCost) {
      return { price: calculatedPrice, wasProtected: false };
    }

    if (protection.mode === "cost_plus_percentage") {
      floor = (variantCost as number) * (1 + protection.value / 100);
    }

    if (protection.mode === "cost_plus_fixed") {
      floor = (variantCost as number) + protection.value;
    }
  }

  if (typeof floor !== "number" || Number.isNaN(floor)) {
    return { price: calculatedPrice, wasProtected: false };
  }

  const normalizedFloor = Math.round(floor * 100) / 100;

  if (calculatedPrice < normalizedFloor) {
    return {
      price: normalizedFloor,
      wasProtected: true,
      floor: normalizedFloor,
    };
  }

  return { price: calculatedPrice, wasProtected: false, floor: normalizedFloor };
}

export function roundPrice(price: number, roundTo: ".99" | ".95" | ".00" = ".99"): number {
  const roundMap = {
    ".99": 0.99,
    ".95": 0.95,
    ".00": 0,
  };

  const target = roundMap[roundTo];
  if (target === 0) {
    return Math.round(price);
  }

  const wholeNumber = Math.floor(price);
  return wholeNumber + target;
}

export function applyDirectionalRounding(
  price: number,
  mode: "none" | "up" | "down" = "none"
): number {
  if (mode === "up") {
    return Math.ceil(price);
  }

  if (mode === "down") {
    return Math.floor(price);
  }

  return Math.round(price * 100) / 100;
}

export function calculatePercentageChange(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0) return 0;
  return Math.round(((newPrice - oldPrice) / oldPrice) * 10000) / 100;
}

export function calculateSavings(oldPrice: number, newPrice: number): number {
  return Math.max(0, Math.round((oldPrice - newPrice) * 100) / 100);
}

export function generateChangeGroupId(): string {
  return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatPrice(price: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatDate(date: string | Date, format: "short" | "long" = "short"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (format === "short") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function calculateEstimatedTime(productCount: number): string {
  // Estimate: 10 products = instant, 1000 = seconds, 10k = minutes
  if (productCount <= 10) return "Instant";
  if (productCount <= 100) return "< 1s";
  if (productCount <= 500) return "~2-5s";
  if (productCount <= 1000) return "~5-10s";
  if (productCount <= 5000) return "~30-60s";
  if (productCount <= 10000) return "~2-3 minutes";
  return "~5+ minutes";
}
