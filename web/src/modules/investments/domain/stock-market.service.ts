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

  // 1. If http client is available, query through backend proxy
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
      // Fallback below
    }
  }

  // 2. Direct browser fetch fallback (for tests or standalone execution)
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(clean)}?interval=1d&range=1d`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta || !meta.regularMarketPrice) return null;

    const quote: StockQuote = {
      ticker: meta.symbol || clean,
      price: meta.regularMarketPrice,
      changePercent: meta.regularMarketChangePercent ?? null,
      currency: meta.currency || "USD",
      exchangeName: meta.fullExchangeName || meta.exchangeName || null,
      updatedAt: new Date().toISOString(),
    };

    quoteCache.set(clean, { quote, timestamp: Date.now() });
    return quote;
  } catch {
    return null;
  }
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
