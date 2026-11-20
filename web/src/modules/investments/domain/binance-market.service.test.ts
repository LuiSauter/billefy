import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  POPULAR_CRYPTOS,
  fetchCryptoTicker,
  calculateCryptoUsdtValue,
  calculateCryptoQuantityFromUsdt,
  extractCryptoSymbol,
  getCryptoBySymbol,
} from "./binance-market.service";

describe("binance-market.service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("contains curated popular cryptocurrencies including BTC as primary", () => {
    expect(POPULAR_CRYPTOS.length).toBeGreaterThanOrEqual(10);
    expect(POPULAR_CRYPTOS[0].symbol).toBe("BTC");
    expect(POPULAR_CRYPTOS[0].pair).toBe("BTCUSDT");

    const eth = getCryptoBySymbol("ETH");
    expect(eth).toBeDefined();
    expect(eth?.name).toBe("Ethereum");
  });

  it("calculates exact USDT valuation from quantity and price", () => {
    // 0.42 BTC at $75,000 = $31,500 USDT
    const val = calculateCryptoUsdtValue(0.42, 75000);
    expect(val).toBe(31500);

    // 10 SOL at $180.50 = $1805.00 USDT
    const valSol = calculateCryptoUsdtValue(10, 180.5);
    expect(valSol).toBe(1805);

    // 0 quantity or negative returns 0
    expect(calculateCryptoUsdtValue(0, 75000)).toBe(0);
    expect(calculateCryptoUsdtValue(-1, 75000)).toBe(0);
  });

  it("calculates exact crypto quantity from USDT value and unit price", () => {
    // $31,500 USDT at $75,000 = 0.42 BTC
    const qty = calculateCryptoQuantityFromUsdt(31500, 75000, 8);
    expect(qty).toBe(0.42);

    // $1,805 USDT at $180.50 = 10 SOL
    const qtySol = calculateCryptoQuantityFromUsdt(1805, 180.5, 4);
    expect(qtySol).toBe(10);

    // 0 value or negative returns 0
    expect(calculateCryptoQuantityFromUsdt(0, 75000)).toBe(0);
    expect(calculateCryptoQuantityFromUsdt(-100, 75000)).toBe(0);
  });

  it("extracts crypto symbols reliably from investment name and metadata", () => {
    expect(extractCryptoSymbol({ name: "Bitcoin (BTC)", kind: "crypto" })).toBe("BTC");
    expect(extractCryptoSymbol({ name: "Ethereum (ETH)", kind: "crypto" })).toBe("ETH");
    expect(extractCryptoSymbol({ name: "Solana", kind: "crypto" })).toBe("SOL");
    expect(extractCryptoSymbol({ name: "S&P 500 ETF (SPY)", kind: "stocks" })).toBeNull();
  });

  it("fetches live 24hr ticker from Binance API and parses fields accurately", async () => {
    const mockBinanceResponse = {
      symbol: "BTCUSDT",
      lastPrice: "76916.50000000",
      priceChangePercent: "-2.082",
      highPrice: "78878.00000000",
      lowPrice: "76541.00000000",
      volume: "13797.51000000",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockBinanceResponse,
    });

    const ticker = await fetchCryptoTicker("BTC");
    expect(ticker).not.toBeNull();
    expect(ticker?.symbol).toBe("BTC");
    expect(ticker?.pair).toBe("BTCUSDT");
    expect(ticker?.price).toBe(76916.5);
    expect(ticker?.priceChangePercent).toBe(-2.082);
    expect(ticker?.highPrice).toBe(78878);
    expect(ticker?.lowPrice).toBe(76541);
  });

  it("handles fetch network failure gracefully returning null", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

    const ticker = await fetchCryptoTicker("BTC");
    expect(ticker).toBeNull();
  });
});
