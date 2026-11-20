import { NextRequest, NextResponse } from "next/server";

export interface MarketSearchResult {
  symbol: string;
  name: string;
  type: "Stock" | "ETF";
  exchange?: string | null;
  sector?: string | null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("query") || searchParams.get("q");

  if (!q || q.trim().length === 0) {
    return NextResponse.json([]);
  }

  const cleanQuery = q.trim();

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanQuery)}&quotesCount=10&newsCount=0`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const data = await res.json();
    const quotes = Array.isArray(data?.quotes) ? data.quotes : [];

    const results: MarketSearchResult[] = [];
    for (const item of quotes) {
      if (item.quoteType !== "EQUITY" && item.quoteType !== "ETF") continue;
      const symbol = item.symbol;
      if (!symbol || symbol.includes("=")) continue;

      const name = item.shortname || item.longname || symbol;
      results.push({
        symbol: symbol.toUpperCase(),
        name,
        type: item.quoteType === "ETF" ? "ETF" : "Stock",
        exchange: item.exchDisp || null,
        sector: item.sector || null,
      });
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
