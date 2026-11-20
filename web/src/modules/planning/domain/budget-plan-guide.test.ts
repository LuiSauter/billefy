import { describe, expect, it } from "vitest";
import { buildBudgetPlanGuide } from "./budget-plan-guide";
import { DistributionPlan } from "./distribution-plan";
import { BudgetDto } from "./planning.types";

const plan: DistributionPlan = {
  enabled: true,
  buckets: [
    { id: "own", name: "Hogar", percent: 65, colorKey: "blue", categoryIds: ["food"] },
    { id: "empty", name: "Ocio", percent: 15, colorKey: "pink", trackingMode: "Expenses", categoryIds: [] },
    { id: "target", name: "Reserva", percent: 20, colorKey: "emerald", trackingMode: "TargetOnly", categoryIds: [] },
  ],
};
const budget = (id: string, categoryId?: string, limitAmount = 10, currency = "BOB"): BudgetDto => ({
  id, categoryId, limitAmount, currency, period: "monthly", isActive: true,
  alertThreshold: 0.8, spentAmount: 999, remainingAmount: -989,
  percentageUsed: 9990, isAlertTriggered: true, isExceeded: true, createdAt: "2026-01-01",
});

const build = (budgets: BudgetDto[], value = plan, owned = ["food", "other"]) =>
  buildBudgetPlanGuide(value, budgets, owned);

describe("read-only monthly plan guide", () => {
  it("groups explicit IDs, defaults legacy mode to Expenses, and separates currencies with Decimal", () => {
    const guide = build([
      budget("a", "FOOD", 0.1), budget("b", "food", 0.2), budget("c", "food", 25, "USD"),
    ])!;
    expect(guide.groups[0]).toMatchObject({ name: "Hogar", percent: 65, mode: "Expenses" });
    expect(guide.groups[0].caps).toEqual([
      { currency: "BOB", amount: "0.3" }, { currency: "USD", amount: "25" },
    ]);
    expect(guide.groups[1].caps).toEqual([]);
    expect(guide.groups[2]).toEqual({ id: "target", name: "Reserva", percent: 20, mode: "TargetOnly" });
  });

  it("keeps general and unassigned limits outside groups and never counts a budget ID twice", () => {
    const assigned = budget("a", "food");
    const guide = build([assigned, assigned, budget("g", undefined, 500), budget("u", "other", 12), budget("m", "missing", 3)])!;
    expect(guide.groups[0].caps).toEqual([{ currency: "BOB", amount: "10" }]);
    expect(guide.general).toEqual([{ currency: "BOB", amount: "500" }]);
    expect(guide.unassigned).toEqual([{ currency: "BOB", amount: "15" }]);
  });

  it("excludes inactive and non-monthly budgets without erasing percentage guidance", () => {
    const guide = build([
      { ...budget("inactive", "food"), isActive: false },
      { ...budget("annual", "food"), period: "yearly" },
    ])!;
    expect(guide.groups.map((group) => group.percent)).toEqual([65, 15, 20]);
    expect(guide.groups[0].caps).toEqual([]);
    expect(guide.general).toEqual([]);
    expect(guide.unassigned).toEqual([]);
  });

  it("offers no fabricated guide for disabled, absent, invalid or missing-category plans", () => {
    expect(build([], { ...plan, enabled: false })).toBeNull();
    expect(buildBudgetPlanGuide(undefined, [], [])).toBeNull();
    expect(build([], { ...plan, buckets: [] })).toBeNull();
    expect(build([], plan, [])).toBeNull();
    const duplicate = { ...plan, buckets: plan.buckets.map((b) => b.id === "empty" ? { ...b, categoryIds: ["food"] } : b) };
    expect(build([], duplicate)).toBeNull();
  });

  it("preserves all input data, including caps, assignments and target-only configuration", () => {
    const budgets = [budget("a", "food"), budget("u", "other")];
    const before = JSON.stringify({ plan, budgets });
    build(budgets);
    expect(JSON.stringify({ plan, budgets })).toBe(before);
    expect(build([])!.groups[2]).not.toHaveProperty("caps");
  });
});
