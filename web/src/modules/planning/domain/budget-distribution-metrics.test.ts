import { describe, expect, it } from "vitest";
import { calculateBudgetDistributionMetrics } from "./budget-distribution-metrics";
import { DistributionPlan } from "./distribution-plan";
import { BudgetDto } from "./planning.types";

const mockPlan: DistributionPlan = {
  enabled: true,
  buckets: [
    {
      id: "b-1",
      name: "Necesidades",
      percent: 50,
      colorKey: "emerald",
      trackingMode: "Expenses",
      categoryIds: ["cat-wifi", "cat-rent", "cat-food"],
    },
    {
      id: "b-2",
      name: "Estilo de vida",
      percent: 30,
      colorKey: "blue",
      trackingMode: "Expenses",
      categoryIds: ["cat-gym", "cat-dining"],
    },
    {
      id: "b-3",
      name: "Ahorro e inversión",
      percent: 20,
      colorKey: "violet",
      trackingMode: "TargetOnly",
      categoryIds: [],
    },
  ],
};

const makeBudget = (
  id: string,
  categoryId: string,
  limitAmount: number,
  spentAmount = 0
): BudgetDto => ({
  id,
  categoryId,
  limitAmount,
  spentAmount,
  currency: "BOB",
  period: "monthly",
  isActive: true,
  alertThreshold: 0.8,
  remainingAmount: limitAmount - spentAmount,
  percentageUsed: limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0,
  isAlertTriggered: spentAmount >= limitAmount * 0.8,
  isExceeded: spentAmount > limitAmount,
  createdAt: "2026-01-01",
});

describe("calculateBudgetDistributionMetrics", () => {
  it("calculates target amounts, budgeted caps, and detects overrun correctly", () => {
    // Income = 2000 Bs
    // Necesidades (50%) -> Target = 1000 Bs
    // Category budgets: Wifi (180), Rent (800), Food (200) -> Total budgeted = 1180 Bs (Overrun: 180 Bs)
    const budgets: BudgetDto[] = [
      makeBudget("b-wifi", "cat-wifi", 180, 50),
      makeBudget("b-rent", "cat-rent", 800, 800),
      makeBudget("b-food", "cat-food", 200, 100),
      makeBudget("b-gym", "cat-gym", 100, 20),
    ];

    const categoryNames: Record<string, string> = {
      "cat-wifi": "Wifi",
      "cat-rent": "Alquiler",
      "cat-food": "Alimentación",
      "cat-gym": "Gimnasio",
    };

    const result = calculateBudgetDistributionMetrics({
      plan: mockPlan,
      monthlyIncome: 2000,
      budgets,
      getCategoryName: (id) => categoryNames[id] ?? "Unknown",
    });

    expect(result.groups).toHaveLength(3);

    // Group 1: Necesidades
    const nec = result.groups[0];
    expect(nec.name).toBe("Necesidades");
    expect(nec.percent).toBe(50);
    expect(nec.targetAmount).toBe(1000);
    expect(nec.budgetedAmount).toBe(1180);
    expect(nec.isOverBudgeted).toBe(true);
    expect(nec.overBudgetedAmount).toBe(180);
    expect(nec.budgetedRatio).toBe(118);
    expect(nec.spentAmount).toBe(950);
    expect(nec.isOverSpent).toBe(false);
    expect(nec.categoryBudgets).toHaveLength(3);
    expect(nec.categoryBudgets.map((c) => c.categoryName)).toEqual([
      "Wifi",
      "Alquiler",
      "Alimentación",
    ]);

    // Group 2: Estilo de vida (30% of 2000 = 600 Bs)
    const life = result.groups[1];
    expect(life.name).toBe("Estilo de vida");
    expect(life.targetAmount).toBe(600);
    expect(life.budgetedAmount).toBe(100);
    expect(life.isOverBudgeted).toBe(false);
    expect(life.overBudgetedAmount).toBe(0);
    expect(life.budgetedRatio).toBeCloseTo(16.67, 1);

    // Group 3: Ahorro e inversión (TargetOnly, 20% of 2000 = 400 Bs)
    const savings = result.groups[2];
    expect(savings.name).toBe("Ahorro e inversión");
    expect(savings.trackingMode).toBe("TargetOnly");
    expect(savings.targetAmount).toBe(400);
    expect(savings.budgetedAmount).toBe(0);
    expect(savings.categoryBudgets).toHaveLength(0);

    // Global summary
    expect(result.hasAnyOverrun).toBe(true);
    expect(result.totalOverrunAmount).toBe(180);
    expect(result.unassignedCategoryBudgets).toHaveLength(0);
  });

  it("handles unassigned category budgets outside the plan", () => {
    const budgets: BudgetDto[] = [
      makeBudget("b-unassigned", "cat-misc", 250, 50),
    ];

    const result = calculateBudgetDistributionMetrics({
      plan: mockPlan,
      monthlyIncome: 2000,
      budgets,
    });

    expect(result.unassignedCategoryBudgets).toHaveLength(1);
    expect(result.unassignedTotalLimit).toBe(250);
    expect(result.unassignedTotalSpent).toBe(50);
  });

  it("falls back to default 50/30/20 when plan is missing or disabled", () => {
    const result = calculateBudgetDistributionMetrics({
      plan: undefined,
      monthlyIncome: 1000,
      budgets: [],
    });

    expect(result.groups).toHaveLength(3);
    expect(result.groups[0].percent).toBe(50);
    expect(result.groups[0].targetAmount).toBe(500);
    expect(result.groups[1].percent).toBe(30);
    expect(result.groups[1].targetAmount).toBe(300);
    expect(result.groups[2].percent).toBe(20);
    expect(result.groups[2].targetAmount).toBe(200);
  });
});
