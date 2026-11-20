import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EditBudgetModal } from "./EditBudgetModal";
import { MonthlyBudgetView } from "./MonthlyBudgetView";
import { BudgetDto } from "../domain/planning.types";
import { calculateBudgetMetrics } from "../domain/budget-calculator";

vi.mock("@/shared/ui/responsive-drawer", () => ({
  ResponsiveDrawer: ({ title, children, footer }: { title: React.ReactNode; children: React.ReactNode; footer: React.ReactNode }) =>
    <section><h2>{title}</h2>{children}{footer}</section>,
}));
vi.mock("@/modules/ledger/application/CategoriesContext", () => ({
  useUserCategories: () => ({ findCategory: () => ({ name: "Comida" }) }),
}));

const budget: BudgetDto = {
  id: "budget", categoryId: "category", currency: "USD", period: "monthly",
  limitAmount: 123.45, alertThreshold: 0.805, spentAmount: 0, remainingAmount: 123.45,
  percentageUsed: 0, isAlertTriggered: false, isExceeded: false, isActive: true, createdAt: "",
};

describe("budget editing presentation", () => {
  it("labels editable values and preserves category, currency and period as read-only controls", () => {
    const html = renderToStaticMarkup(<EditBudgetModal budget={budget} onClose={vi.fn()} onSubmit={vi.fn()} />);
    for (const label of ["Editar presupuesto", "Categoría", "Moneda", "Período", "Límite", "Alerta (%)", "Guardar cambios"]) {
      expect(html).toContain(label);
    }
    expect(html.match(/readonly=""/gi)).toHaveLength(3);
    for (const value of ["Comida", "USD", "Mensual", "123.45", "80.5"]) expect(html).toContain(`value="${value}"`);
    expect(html).toContain("Elegí explícitamente un porcentaje entero");
  });

  it("offers an accessible edit action only for active monthly budgets when supplied", () => {
    const render = (item: BudgetDto, editable = true) => renderToStaticMarkup(<MonthlyBudgetView
      budgets={[item]} metrics={calculateBudgetMetrics([item], 10)} onOpenCreateBudgetModal={vi.fn()}
      onEditBudget={editable ? vi.fn() : undefined}
    />);
    expect(render(budget)).toContain('aria-label="Editar presupuesto de Comida (USD)"');
    expect(render({ ...budget, isActive: false })).not.toContain('aria-label="Editar presupuesto');
    expect(render({ ...budget, period: "weekly" })).not.toContain('aria-label="Editar presupuesto');
    expect(render(budget, false)).not.toContain('aria-label="Editar presupuesto');
  });
});
