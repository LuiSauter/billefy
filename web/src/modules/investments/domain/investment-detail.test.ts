import { describe, it, expect } from "vitest";
import {
  calculateInvestmentDetailMetrics,
  calculateAssetEvolutionPoints,
  getDerivedOperations,
} from "./investment-detail";
import { Investment } from "./investment.types";

const mockBtc: Investment = {
  id: "inv-btc",
  name: "Bitcoin (BTC)",
  kind: "crypto",
  iconKey: "coins",
  colorKey: "amber",
  currency: "USD",
  quantity: 0.42,
  initialValue: 55000,
  currentValue: 67420,
  history: [
    { at: "2026-05-15T00:00:00Z", value: 40000 },
    { at: "2026-06-15T00:00:00Z", value: 50000 },
    { at: "2026-07-15T00:00:00Z", value: 49000 },
    { at: "2026-08-15T00:00:00Z", value: 58000 },
    { at: "2026-09-15T00:00:00Z", value: 61000 },
    { at: "2026-10-15T00:00:00Z", value: 67420 },
  ],
  createdAt: "2026-01-15T00:00:00Z",
};

const allInvestments: Investment[] = [
  mockBtc,
  {
    id: "inv-eth",
    name: "Ethereum (ETH)",
    kind: "crypto",
    iconKey: "coins",
    colorKey: "violet",
    currency: "USD",
    quantity: 10,
    initialValue: 40000,
    currentValue: 45000,
    history: [],
    createdAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "inv-stocks",
    name: "Apple Inc.",
    kind: "stocks",
    iconKey: "trending-up",
    colorKey: "blue",
    currency: "USD",
    quantity: 500,
    initialValue: 90000,
    currentValue: 95660,
    history: [],
    createdAt: "2026-01-15T00:00:00Z",
  },
];

describe("investment-detail domain", () => {
  it("calculates asset detail metrics accurately", () => {
    const metrics = calculateInvestmentDetailMetrics(mockBtc, allInvestments);

    expect(metrics.currentValue).toBe(67420);
    expect(metrics.initialValue).toBe(55000);
    expect(metrics.gainLoss).toBe(12420);
    // (12420 / 55000) * 100 = 22.5818%
    expect(metrics.gainLossPct).toBeCloseTo(22.58, 1);
    expect(metrics.roiPct).toBeCloseTo(22.58, 1);

    // Quantity = 0.42 BTC
    expect(metrics.quantity).toBe(0.42);
    // Average cost = 55000 / 0.42 = ~130,952.38
    expect(metrics.averageCost).toBeCloseTo(130952.38, 1);
    // Current unit price = 67420 / 0.42 = ~160,523.80
    expect(metrics.currentUnitPrice).toBeCloseTo(160523.8, 1);

    // Portfolio share: total portfolio is 67420 + 45000 + 95660 = 208080
    // 67420 / 208080 = ~32.40%
    expect(metrics.portfolioSharePct).toBeCloseTo(32.4, 1);
  });

  it("produces asset evolution points for chart", () => {
    const points = calculateAssetEvolutionPoints(mockBtc, 6);
    expect(points.length).toBe(6);
    expect(points[points.length - 1].value).toBe(67420);
  });

  it("generates structured operations based on history or initial value", () => {
    const ops = getDerivedOperations(mockBtc);
    expect(ops.length).toBeGreaterThan(0);
    expect(ops[0].status).toBe("completed");
    expect(ops[0].totalAmount).toBeGreaterThan(0);
  });
});
