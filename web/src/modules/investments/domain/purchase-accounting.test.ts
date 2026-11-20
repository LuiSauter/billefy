import { describe, expect, it } from "vitest";
import { Investment, investmentVariationPct } from "./investment.types";
import { calculateInvestmentDetailMetrics } from "./investment-detail";
import { calculatePortfolioOverview } from "./portfolio-analytics";

const position = (extra: Partial<Investment> = {}): Investment => ({
  id: "shares", name: "January shares", kind: "stocks", currency: "BOB", iconKey: "trending-up", colorKey: "blue",
  quantity: 25, initialValue: 2000, currentValue: 2750, history: [], createdAt: "2027-01-01", ...extra,
});

describe("historical investment purchase cost", () => {
  it("uses accumulated cost after a purchase, not the opening snapshot or market price", () => {
    const investment = position({ costBasis: 2600, unrealizedGain: 150 });
    const detail = calculateInvestmentDetailMetrics(investment, [investment]);
    expect(detail.costBasis).toBe(2600);
    expect(detail.averageCost).toBe(104);
    expect(detail.gainLoss).toBe(150);
    expect(detail.currentUnitPrice).toBe(110);
    expect(investmentVariationPct(investment)).toBeCloseTo(150 / 2600 * 100);
    const portfolio = calculatePortfolioOverview([investment], "BOB");
    expect(portfolio.totalCost).toBe(2600);
    expect(portfolio.totalGainLoss).toBe(150);
    expect(portfolio.performanceRanking[0].gainLoss).toBe(150);
  });

  it("does not interpret contributed capital as performance", () => {
    const investment = position({ currentValue: 2600, costBasis: 2600 });
    expect(investmentVariationPct(investment)).toBe(0);
    expect(calculatePortfolioOverview([investment], "BOB").totalGainLoss).toBe(0);
  });

  it("keeps explicitly unknown legacy cost unknown rather than falling back to valuation", () => {
    const investment = position({ costBasis: null, unrealizedGain: null });
    expect(investmentVariationPct(investment)).toBeNull();
    expect(calculateInvestmentDetailMetrics(investment, [investment]).costBasis).toBeNull();
    expect(calculatePortfolioOverview([investment], "BOB").hasUnknownCost).toBe(true);
  });

  it("preserves older-server fallback when the additive cost field is absent", () => {
    const investment = position();
    expect(investmentVariationPct(investment)).toBe(37.5);
    expect(calculatePortfolioOverview([investment], "BOB").totalCost).toBe(2000);
    expect(calculateInvestmentDetailMetrics(investment, [investment]).averageCost).toBe(80);
  });
});
