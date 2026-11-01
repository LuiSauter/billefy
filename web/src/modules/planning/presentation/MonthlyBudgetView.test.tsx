import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MonthlyBudgetView } from "./MonthlyBudgetView";
import { BudgetDto } from "../domain/planning.types";
import { buildBudgetRows, calculateBudgetMetrics } from "../domain/budget-calculator";
import { UserCategory } from "@/modules/ledger/domain/category.types";

const { findCategory } = vi.hoisted(() => ({ findCategory: vi.fn() }));
vi.mock("@/modules/ledger/application/CategoriesContext", () => ({
  useUserCategories: () => ({ findCategory }),
}));

const categoryId = "7bd4b50a-ef26-449d-970c-e4e556287fec";
const budget: BudgetDto = {
  id: "budget", categoryId, period: "monthly", limitAmount: 100,
  currency: "BOB", alertThreshold: 0.8, spentAmount: 25, remainingAmount: 75,
  percentageUsed: 25, isAlertTriggered: false, isExceeded: false,
  isActive: true, createdAt: "2026-01-01T00:00:00Z",
};
const category: UserCategory = {
  id: categoryId, name: "Comida familiar", direction: "Expense", iconKey: "utensils",
  colorKey: "blue", createdAt: "2026-01-01T00:00:00Z",
};

function render(item = budget) {
  return renderToStaticMarkup(React.createElement(MonthlyBudgetView, {
    budgets: [item], metrics: calculateBudgetMetrics([item], 10),
    onOpenCreateBudgetModal: vi.fn(),
  }));
}

beforeEach(() => findCategory.mockReset());

describe("monthly budget labels and purpose", () => {
  it("renders the user's category name and name-based emoji instead of its UUID", () => {
    findCategory.mockReturnValue(category);
    const html = render();
    expect(html).toContain("Comida familiar");
    expect(html).toContain("🍔");
    expect(html).not.toContain(categoryId);
    expect(findCategory).toHaveBeenCalledWith(categoryId);
  });

  it("keeps Gastos Generales for a null category ID without looking it up", () => {
    // The API serializes absent category IDs as null; the web DTO makes them optional.
    const item = JSON.parse(JSON.stringify({ ...budget, categoryId: null })) as BudgetDto;
    expect(render(item)).toContain("Gastos Generales");
    expect(findCategory).not.toHaveBeenCalled();
  });

  it("clearly labels an unavailable or deleted category without exposing its UUID", () => {
    const html = render();
    expect(html).toContain("Categoría no disponible");
    expect(html).not.toContain(categoryId);
    expect(html).not.toContain("Gastos Generales");
  });

  it("uses the latest shared category name and handles removal on subsequent renders", () => {
    findCategory.mockReturnValue({ ...category, name: "Compras del hogar" });
    expect(render()).toContain("Compras del hogar");
    findCategory.mockReturnValue(undefined);
    expect(render()).toContain("Categoría no disponible");
  });
});

const row = (over: Partial<BudgetDto>) => ({ ...budget, ...over }) as BudgetDto;

describe("buildBudgetRows", () => {
  it("prioritizes exceeded, then near-limit by configured threshold, then normal budgets", () => {
    const rows = buildBudgetRows([
      row({ id: "ok", spentAmount: 10 }),
      row({ id: "near", spentAmount: 76, alertThreshold: 0.75 }),
      row({ id: "over", spentAmount: 130 }),
      row({ id: "worse", spentAmount: 300 }),
    ]);
    expect(rows.map((r) => r.budget.id)).toEqual(["worse", "over", "near", "ok"]);
    expect(rows.map((r) => r.status)).toEqual(["exceeded", "exceeded", "alert", "ok"]);
  });

  it("uses the budget's own alert threshold instead of a fixed 80%", () => {
    const [low] = buildBudgetRows([row({ spentAmount: 60, alertThreshold: 0.5 })]);
    const [high] = buildBudgetRows([row({ spentAmount: 85, alertThreshold: 0.9 })]);
    expect(low.status).toBe("alert");
    expect(low.thresholdLabel).toBe("50%");
    expect(high.status).toBe("ok");
    expect(buildBudgetRows([row({ alertThreshold: 0.825 })])[0].thresholdLabel).toBe("82.5%");
  });

  it("reports exceeded amount and uncapped usage with the budget currency and exact decimals", () => {
    const [over] = buildBudgetRows([row({ currency: "USD", limitAmount: 100, spentAmount: 130.1 })]);
    expect(over.usedPercent).toBe(130);
    expect(over.barPercent).toBe(100);
    expect(over.limit).toBe("USD 100.00");
    expect(over.spent).toBe("USD 130.10");
    expect(over.balanceLabel).toBe("Excedido");
    expect(over.balance).toBe("USD 30.10");
    const [btc] = buildBudgetRows([row({ currency: "BTC", limitAmount: 0.3, spentAmount: 0.1 })]);
    expect(btc.balanceLabel).toBe("Disponible");
    expect(btc.balance).toBe("BTC 0.20000000");
  });

  it("treats reaching the limit exactly as reached, not exceeded", () => {
    const [reached] = buildBudgetRows([row({ spentAmount: 100 })]);
    expect(reached.status).toBe("alert");
    expect(reached.balance).toBe("BOB 0.00");
  });
});

describe("actionable budget list", () => {
  const renderMany = (items: BudgetDto[]) => renderToStaticMarkup(React.createElement(MonthlyBudgetView, {
    budgets: items, metrics: calculateBudgetMetrics(items, 10), onOpenCreateBudgetModal: vi.fn(),
  }));

  it("shows currency, exceeded amount, configured threshold and a priority summary", () => {
    findCategory.mockReturnValue(category);
    const html = renderMany([row({ id: "a", currency: "USD", spentAmount: 130 }), row({ id: "b", spentAmount: 76, alertThreshold: 0.75 })]);
    expect(html).toContain("USD 130.00");
    expect(html).toContain("Excedido");
    expect(html).toContain("USD 30.00");
    expect(html).toContain("Alerta al 75%");
    expect(html).toContain("1 excedido");
    expect(html).toContain("1 cerca del límite");
    expect(html).not.toContain("Bs 130");
    expect(html.indexOf("USD 130.00")).toBeLessThan(html.indexOf("BOB 76.00"));
  });

  it("does not claim fixed 80% alerts or a single currency in its description", () => {
    const html = renderMany([budget]);
    expect(html).not.toContain("alertas al 80% y 100% en moneda boliviana");
    expect(html).not.toContain("min-w-[620px]");
  });
});
