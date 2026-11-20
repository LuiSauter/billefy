import { describe, it, expect } from "vitest";
import {
  calculatePortfolioOverview,
  calculatePortfolioEvolutionPoints,
  filterInvestmentsByKind,
} from "./portfolio-analytics";
import { Investment } from "./investment.types";

const mockInvestments: Investment[] = [
  {
    id: "inv-btc",
    name: "Bitcoin (BTC)",
    kind: "crypto",
    iconKey: "coins",
    colorKey: "amber",
    currency: "USD",
    quantity: 0.1,
    initialValue: 4970,
    currentValue: 6200,
    history: [
      { at: "2026-05-15T00:00:00Z", value: 4970 },
      { at: "2026-07-20T00:00:00Z", value: 5500 },
      { at: "2026-10-10T00:00:00Z", value: 6200 },
    ],
    createdAt: "2026-05-15T00:00:00Z",
  },
  {
    id: "inv-eth",
    name: "Ethereum (ETH)",
    kind: "crypto",
    iconKey: "coins",
    colorKey: "violet",
    currency: "USD",
    quantity: 1,
    initialValue: 2600,
    currentValue: 3100,
    history: [
      { at: "2026-06-01T00:00:00Z", value: 2600 },
      { at: "2026-10-10T00:00:00Z", value: 3100 },
    ],
    createdAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "inv-sp500",
    name: "S&P 500 (VOO)",
    kind: "funds",
    iconKey: "trending-up",
    colorKey: "blue",
    currency: "USD",
    quantity: 35,
    initialValue: 16560,
    currentValue: 18000,
    history: [
      { at: "2026-05-01T00:00:00Z", value: 16560 },
      { at: "2026-10-10T00:00:00Z", value: 18000 },
    ],
    createdAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "inv-re",
    name: "Inmueble (Depto. Alquiler)",
    kind: "realestate",
    iconKey: "home",
    colorKey: "emerald",
    currency: "USD",
    quantity: 1,
    initialValue: 10050,
    currentValue: 11000,
    history: [
      { at: "2026-05-01T00:00:00Z", value: 10050 },
      { at: "2026-10-10T00:00:00Z", value: 11000 },
    ],
    createdAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "inv-other",
    name: "Fondo de inversión (Mixto)",
    kind: "other",
    iconKey: "sparkles",
    colorKey: "cyan",
    currency: "USD",
    quantity: 100,
    initialValue: 6460,
    currentValue: 7400,
    history: [
      { at: "2026-05-01T00:00:00Z", value: 6460 },
      { at: "2026-10-10T00:00:00Z", value: 7400 },
    ],
    createdAt: "2026-05-01T00:00:00Z",
  },
];

describe("portfolio-analytics", () => {
  it("calculates total portfolio KPIs accurately", () => {
    const overview = calculatePortfolioOverview(mockInvestments);

    // Total value: 6200 + 3100 + 18000 + 11000 + 7400 = 45700
    expect(overview.totalValue).toBe(45700);

    // Total cost basis: 4970 + 2600 + 16560 + 10050 + 6460 = 40640
    expect(overview.totalCost).toBe(40640);

    // Gain/Loss: 45700 - 40640 = 5060
    expect(overview.totalGainLoss).toBe(5060);

    // Gain/Loss %: (5060 / 40640) * 100 = 12.4507... -> approx 12.5%
    expect(overview.totalGainLossPct).toBeCloseTo(12.45, 1);

    // Count of investments
    expect(overview.totalCount).toBe(5);
  });

  it("calculates distribution percentages by asset kind matching 100% total", () => {
    const overview = calculatePortfolioOverview(mockInvestments);

    expect(overview.categoryDistribution.length).toBeGreaterThan(0);
    const sumPct = overview.categoryDistribution.reduce((acc, c) => acc + c.percentage, 0);
    expect(sumPct).toBeCloseTo(100, 1);

    // Crypto: (6200 + 3100) / 45700 = 9300 / 45700 = ~20.35%
    const crypto = overview.categoryDistribution.find((c) => c.kind === "crypto");
    expect(crypto).toBeDefined();
    expect(crypto!.totalValue).toBe(9300);
  });

  it("ranks investments by performance descending", () => {
    const overview = calculatePortfolioOverview(mockInvestments);

    // Bitcoin: (6200 - 4970) / 4970 = 24.74%
    // Ethereum: (3100 - 2600) / 2600 = 19.23%
    // Fondo mixto: (7400 - 6460) / 6460 = 14.55%
    // Inmueble: (11000 - 10050) / 10050 = 9.45%
    // S&P 500: (18000 - 16560) / 16560 = 8.69%
    expect(overview.performanceRanking[0].name).toBe("Bitcoin (BTC)");
    expect(overview.performanceRanking[0].performancePct).toBeCloseTo(24.75, 1);
    expect(overview.performanceRanking[1].name).toBe("Ethereum (ETH)");
  });

  it("filters investments by category correctly", () => {
    expect(filterInvestmentsByKind(mockInvestments, "all")).toHaveLength(5);
    expect(filterInvestmentsByKind(mockInvestments, "crypto")).toHaveLength(2);
    expect(filterInvestmentsByKind(mockInvestments, "funds")).toHaveLength(1);
    expect(filterInvestmentsByKind(mockInvestments, "stocks")).toHaveLength(0);
    expect(filterInvestmentsByKind(mockInvestments, "realestate")).toHaveLength(1);
    expect(filterInvestmentsByKind(mockInvestments, "other")).toHaveLength(1);
  });

  it("calculates evolution points with non-empty timeline", () => {
    const points = calculatePortfolioEvolutionPoints(mockInvestments, 6);
    expect(points.length).toBe(6);
    expect(points[points.length - 1].value).toBe(45700);
  });

  it("handles empty investments list gracefully", () => {
    const overview = calculatePortfolioOverview([]);
    expect(overview.totalValue).toBe(0);
    expect(overview.totalCost).toBe(0);
    expect(overview.totalGainLoss).toBe(0);
    expect(overview.totalGainLossPct).toBe(0);
    expect(overview.performanceRanking).toEqual([]);
    expect(overview.categoryDistribution).toEqual([]);
  });

  it("normalizes multi-currency investments using p2pRate and targetCurrency", () => {
    const multiInvestments: Investment[] = [
      {
        id: "inv-usd",
        name: "Apple Stock",
        kind: "stocks",
        currency: "USD",
        initialValue: 1000,
        currentValue: 1500,
        quantity: 10,
        iconKey: "sparkles",
        colorKey: "blue",
        history: [],
        createdAt: "2026-01-01",
      },
      {
        id: "inv-bob",
        name: "Fondo Mutuo BOB",
        kind: "funds",
        currency: "BOB",
        initialValue: 10000,
        currentValue: 10000,
        quantity: 1,
        iconKey: "sparkles",
        colorKey: "blue",
        history: [],
        createdAt: "2026-01-01",
      },
    ];

    // Valued in USD with p2pRate = 10:
    // Apple = $1,500 USD
    // Fondo BOB = 10,000 / 10 = $1,000 USD
    // Total Value in USD = $2,500 USD
    const usdOverview = calculatePortfolioOverview(multiInvestments, "USD", 10);
    expect(usdOverview.totalValue).toBe(2500);
    expect(usdOverview.totalCost).toBe(2000); // 1000 USD + (10000/10) = 2000
    expect(usdOverview.totalGainLoss).toBe(500);

    // Valued in BOB with p2pRate = 10:
    // Apple = 1,500 * 10 = 15,000 BOB
    // Fondo BOB = 10,000 BOB
    // Total Value in BOB = 25,000 BOB
    const bobOverview = calculatePortfolioOverview(multiInvestments, "BOB", 10);
    expect(bobOverview.totalValue).toBe(25000);
    expect(bobOverview.totalCost).toBe(20000);
    expect(bobOverview.totalGainLoss).toBe(5000);
  });
});
