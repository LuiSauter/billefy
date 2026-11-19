import { describe, it, expect, vi } from "vitest";
import {
  calculateStockTotalValue,
  calculateStockQuantityFromValue,
  fetchStockQuote,
  searchStocks,
} from "./stock-market.service";
import { IHttpClient } from "@/shared/application/http-client.contract";

describe("stock-market.service", () => {
  describe("calculateStockTotalValue", () => {
    it("multiplies quantity by price with exact rounding", () => {
      expect(calculateStockTotalValue(10, 150.5)).toBe(1505);
      expect(calculateStockTotalValue(2.5, 342.37)).toBe(855.93);
      expect(calculateStockTotalValue(0, 100)).toBe(0);
      expect(calculateStockTotalValue(10, -5)).toBe(0);
    });
  });

  describe("calculateStockQuantityFromValue", () => {
    it("divides value by price supporting fractional shares", () => {
      expect(calculateStockQuantityFromValue(1000, 200)).toBe(5);
      expect(calculateStockQuantityFromValue(500, 342.37, 4)).toBe(1.4604);
      expect(calculateStockQuantityFromValue(0, 100)).toBe(0);
    });
  });

  describe("fetchStockQuote", () => {
    it("queries through http client when provided", async () => {
      const mockHttp: IHttpClient = {
        get: vi.fn().mockResolvedValue({
          ticker: "AAPL",
          price: 342.37,
          changePercent: -0.52,
          currency: "USD",
          exchangeName: "NasdaqGS",
          updatedAt: "2026-11-09T00:00:00Z",
        }),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        setAuthSession: vi.fn(),
        getAuthToken: vi.fn(),
        getUserId: vi.fn(),
      };

      const quote = await fetchStockQuote("AAPL", mockHttp);
      expect(quote).not.toBeNull();
      expect(quote?.ticker).toBe("AAPL");
      expect(quote?.price).toBe(342.37);
      expect(mockHttp.get).toHaveBeenCalledWith("/v1/planning/market/quote?ticker=AAPL");
    });

    it("returns null on blank ticker", async () => {
      const quote = await fetchStockQuote("");
      expect(quote).toBeNull();
    });
  });

  describe("searchStocks", () => {
    it("returns curated popular list when query is empty", async () => {
      const results = await searchStocks("");
      expect(results.length).toBeGreaterThan(5);
      expect(results.some((r) => r.symbol === "NVDA")).toBe(true);
    });

    it("filters locally and merges with backend results", async () => {
      const mockHttp: IHttpClient = {
        get: vi.fn().mockResolvedValue([
          {
            symbol: "NVDA",
            name: "NVIDIA Corp.",
            type: "Stock",
            exchange: "NASDAQ",
            sector: "Technology",
          },
        ]),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        setAuthSession: vi.fn(),
        getAuthToken: vi.fn(),
        getUserId: vi.fn(),
      };

      const results = await searchStocks("nvda", mockHttp);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].symbol).toBe("NVDA");
      expect(mockHttp.get).toHaveBeenCalledWith("/v1/planning/market/search?query=nvda");
    });
  });
});
