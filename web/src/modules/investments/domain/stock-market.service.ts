import Decimal from "decimal.js";
import { IHttpClient } from "@/shared/application/http-client.contract";

export interface StockQuote {
  ticker: string;
  price: number;
  changePercent: number | null;
  currency: string;
  exchangeName?: string | null;
  updatedAt: string;
}

const quoteCache = new Map<string, { quote: StockQuote; timestamp: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

export async function fetchStockQuote(
  ticker: string,
  http?: IHttpClient | null
): Promise<StockQuote | null> {
  const clean = ticker.trim().toUpperCase();
  if (!clean) return null;

  const cached = quoteCache.get(clean);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.quote;
  }

  // 1. If http client is available, query through .NET backend proxy
  if (http) {
    try {
      const data = await http.get<StockQuote>(
        `/v1/planning/market/quote?ticker=${encodeURIComponent(clean)}`
      );
      if (data && data.price > 0) {
        quoteCache.set(clean, { quote: data, timestamp: Date.now() });
        return data;
      }
    } catch {
      // Fallback to internal Next.js server route below
    }
  }

  // 2. Query through internal Next.js Route Handler (running server-side, 0 CORS issues)
  try {
    const res = await fetch(`/api/market/quote?ticker=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data: StockQuote = await res.json();
      if (data && data.price > 0) {
        quoteCache.set(clean, { quote: data, timestamp: Date.now() });
        return data;
      }
    }
  } catch {
    // Return null if offline or server unreachable
  }

  return null;
}

export function calculateStockTotalValue(quantity: number, price: number): number {
  if (!quantity || quantity <= 0 || !price || price <= 0) return 0;
  return new Decimal(quantity)
    .times(new Decimal(price))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
}

export function calculateStockQuantityFromValue(
  totalValue: number,
  price: number,
  decimals: number = 4
): number {
  if (!totalValue || totalValue <= 0 || !price || price <= 0) return 0;
  return new Decimal(totalValue)
    .div(new Decimal(price))
    .toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP)
    .toNumber();
}
