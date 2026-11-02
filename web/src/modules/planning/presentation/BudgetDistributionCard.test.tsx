import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BudgetDistributionCard } from "./BudgetDistributionCard";
import { DistributionPlan } from "../domain/distribution-plan";
import { BudgetDto } from "../domain/planning.types";

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
      categoryIds: ["cat-gym"],
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

describe("BudgetDistributionCard", () => {
  it("renders the title, rule label, and adjust rule button", () => {
    const html = renderToStaticMarkup(
      <BudgetDistributionCard
        plan={mockPlan}
        monthlyIncome={2000}
        budgets={[]}
        onOpenAdjustRule={vi.fn()}
        formatMoney={(val) => `Bs. ${val}`}
      />
    );

    expect(html).toContain("Distribución del presupuesto");
    expect(html).toContain("Regla 50/30/20 (personalizable)");
    expect(html).toContain("Ajustar regla");
  });

  it("highlights overrun warning when category budgets exceed the rule", () => {
    // 50% of 2000 = 1000 Bs target
    // Category budgets: 180 + 800 + 200 = 1180 Bs (exceeds by 180 Bs)
    const budgets: BudgetDto[] = [
      makeBudget("b-wifi", "cat-wifi", 180),
      makeBudget("b-rent", "cat-rent", 800),
      makeBudget("b-food", "cat-food", 200),
    ];

    const html = renderToStaticMarkup(
      <BudgetDistributionCard
        plan={mockPlan}
        monthlyIncome={2000}
        budgets={budgets}
        onOpenAdjustRule={vi.fn()}
        formatMoney={(val) => `Bs. ${val}`}
      />
    );

    // Overrun indicator
    expect(html).toContain("Excedido en Bs. 180");
    expect(html).toContain("Presupuestado");
    expect(html).toContain("Bs. 1180");
  });

  it("shows healthy margin when budgets are within the rule", () => {
    // 50% of 2000 = 1000 Bs target
    // Category budgets: 500 Bs -> Margin 500 Bs
    const budgets: BudgetDto[] = [
      makeBudget("b-rent", "cat-rent", 500),
    ];

    const html = renderToStaticMarkup(
      <BudgetDistributionCard
        plan={mockPlan}
        monthlyIncome={2000}
        budgets={budgets}
        onOpenAdjustRule={vi.fn()}
        formatMoney={(val) => `Bs. ${val}`}
      />
    );

    expect(html).toContain("Bs. 500 de margen");
  });
});
