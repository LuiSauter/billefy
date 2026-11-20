import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get("ticker");

  if (!ticker || ticker.trim().length === 0 || ticker.length > 20) {
    return NextResponse.json(
      { error: "A valid ticker symbol is required" },
      { status: 400 }
    );
  }

  const cleanTicker = ticker.trim().toUpperCase();

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanTicker)}?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        // Cache on server for 30 seconds to prevent rate-limiting
        next: { revalidate: 30 },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Quote for ticker '${cleanTicker}' not found` },
        { status: 404 }
      );
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;

    if (!meta || !meta.regularMarketPrice) {
      return NextResponse.json(
        { error: `No market data found for '${cleanTicker}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ticker: meta.symbol || cleanTicker,
      price: meta.regularMarketPrice,
      changePercent: meta.regularMarketChangePercent ?? null,
      currency: meta.currency || "USD",
      exchangeName: meta.fullExchangeName || meta.exchangeName || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch market quote from upstream provider", detail: String(err) },
      { status: 502 }
    );
  }
}
