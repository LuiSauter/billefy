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

export interface StockSearchResult {
  symbol: string;
  name: string;
  type: "Stock" | "ETF";
  exchange?: string | null;
  sector?: string | null;
}

export const CURATED_POPULAR_STOCKS: StockSearchResult[] = [
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "Stock", exchange: "NASDAQ", sector: "Technology" },
  { symbol: "AAPL", name: "Apple Inc.", type: "Stock", exchange: "NASDAQ", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft Corporation", type: "Stock", exchange: "NASDAQ", sector: "Technology" },
  { symbol: "AMZN", name: "Amazon.com, Inc.", type: "Stock", exchange: "NASDAQ", sector: "Consumer Cyclical" },
  { symbol: "GOOGL", name: "Alphabet Inc. (Google)", type: "Stock", exchange: "NASDAQ", sector: "Communication" },
  { symbol: "META", name: "Meta Platforms, Inc.", type: "Stock", exchange: "NASDAQ", sector: "Communication" },
  { symbol: "TSLA", name: "Tesla, Inc.", type: "Stock", exchange: "NASDAQ", sector: "Consumer Cyclical" },
  { symbol: "MELI", name: "MercadoLibre, Inc.", type: "Stock", exchange: "NASDAQ", sector: "Consumer Cyclical" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", type: "ETF", exchange: "NYSE", sector: "Index" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "ETF", exchange: "NYSE", sector: "Index" },
  { symbol: "QQQ", name: "Invesco QQQ (Nasdaq 100)", type: "ETF", exchange: "NASDAQ", sector: "Technology" },
  { symbol: "VTI", name: "Vanguard Total Stock Market", type: "ETF", exchange: "NYSE", sector: "Total Market" },
  { symbol: "SCHD", name: "Schwab U.S. Dividend Equity", type: "ETF", exchange: "NYSE", sector: "Dividends" },
  { symbol: "VT", name: "Vanguard Total World Stock", type: "ETF", exchange: "NYSE", sector: "Global" },
];

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

export async function searchStocks(
  query: string,
  http?: IHttpClient | null
): Promise<StockSearchResult[]> {
  const q = query.trim();
  if (!q) {
    return CURATED_POPULAR_STOCKS;
  }

  const lower = q.toLowerCase();
  const localMatches = CURATED_POPULAR_STOCKS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(lower) ||
      s.name.toLowerCase().includes(lower)
  );

  let remoteMatches: StockSearchResult[] = [];
  if (http) {
    try {
      const data = await http.get<StockSearchResult[]>(
        `/v1/planning/market/search?query=${encodeURIComponent(q)}`
      );
      if (Array.isArray(data)) {
        remoteMatches = data;
      }
    } catch {
      // Fallback below
    }
  }

  if (remoteMatches.length === 0) {
    try {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          remoteMatches = data;
        }
      }
    } catch {
      // Offline fallback
    }
  }

  const seen = new Set<string>();
  const merged: StockSearchResult[] = [];

  for (const item of [...remoteMatches, ...localMatches]) {
    const sym = item.symbol.toUpperCase();
    if (!seen.has(sym)) {
      seen.add(sym);
      merged.push(item);
    }
  }

  return merged;
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
