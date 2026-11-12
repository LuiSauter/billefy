import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DistributionPlanGuide } from "./DistributionPlanGuide";
import { DistributionPlan } from "../domain/distribution-plan";
import { BudgetDto } from "../domain/planning.types";

vi.mock("@/modules/ledger/application/CategoriesContext", () => ({
  useUserCategories: () => ({ categories: [{ id: "food", direction: "Expense" }] }),
}));
const plan: DistributionPlan = {
  enabled: true,
  buckets: [
    { id: "home", name: "Mi hogar", percent: 75, colorKey: "blue", categoryIds: ["food"] },
    { id: "reserve", name: "Reserva", percent: 25, colorKey: "emerald", trackingMode: "TargetOnly", categoryIds: [] },
  ],
};
const budgets = [
  { id: "bob", categoryId: "food", currency: "BOB", limitAmount: 80 },
  { id: "usd", categoryId: "food", currency: "USD", limitAmount: 12 },
  { id: "general", currency: "EUR", limitAmount: 90 },
  { id: "other", categoryId: "missing", currency: "USD", limitAmount: 7 },
].map((b) => ({ ...b, period: "monthly", isActive: true, spentAmount: 987654 } as BudgetDto));
const render = (value: DistributionPlan | undefined = plan, items = budgets) =>
  renderToStaticMarkup(<DistributionPlanGuide plan={value} budgets={items} />);

describe("distribution plan guide presentation", () => {
  it("shows the loaded custom plan and configured limits per currency, not spending or income allocations", () => {
    const html = render();
    for (const text of ["Mi hogar", "75,00%", "Gastos", "Bs 80,00", "$ 12,00", "€ 90,00", "$ 7,00", "Límites generales", "Categorías sin grupo"]) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain("987654");
    expect(html).not.toContain("50 / 30 / 20");
    const target = html.split("<article").find((part) => part.includes("Reserva"))!.split("</article>")[0];
    expect(target).toContain("25,00%");
    expect(target).toContain("Solo objetivo");
    expect(target).not.toMatch(/BOB|USD|EUR|progress|contribuciones/);
  });

  it("retains percentage guidance with no budgets and explicitly explains missing configured caps", () => {
    const html = render(plan, []);
    expect(html).toContain("75,00%");
    expect(html).toContain("Sin límites configurados");
    expect(html).not.toContain("BOB 0");
  });

  it("gives Settings guidance without claiming the default state confirms a disabled or failed load", () => {
    for (const value of [{ ...plan, enabled: false }, { ...plan, buckets: [] }]) {
      const html = render(value);
      expect(html).toContain("Configuración");
      expect(html).not.toMatch(/desactivado|error de carga|BOB|75%|50\/30\/20/);
    }
    const absent = renderToStaticMarkup(<DistributionPlanGuide budgets={budgets} />);
    expect(absent).toContain("Configuración");
    expect(absent).not.toMatch(/BOB|75%|desactivado/);
  });
});

describe("distribution plan guide load states", () => {
  const renderStatus = (planStatus: "loading" | "error" | "stale" | "loaded", value: DistributionPlan = plan) =>
    renderToStaticMarkup(
      <DistributionPlanGuide plan={value} budgets={budgets} planStatus={planStatus} onRetryPlan={vi.fn()} />
    );

  it("shows loading without claiming the plan is missing or disabled", () => {
    const html = renderStatus("loading");
    expect(html).toContain('role="status"');
    expect(html).toContain("Cargando tu plan");
    expect(html).not.toMatch(/Configuración|75%|Reintentar/);
  });

  it("shows an actionable error when the plan could not be read", () => {
    const html = renderStatus("error", { enabled: false, buckets: [] });
    expect(html).toContain('role="alert"');
    expect(html).toContain("No se pudo cargar tu plan");
    expect(html).toContain("Reintentar");
    expect(html).not.toContain("No hay una guía de distribución válida");
  });

  it("keeps the last loaded plan with a stale warning when a refresh fails", () => {
    const html = renderStatus("stale");
    expect(html).toContain("75,00%");
    expect(html).toContain("puede estar desactualizado");
    expect(html).toContain("Reintentar");
  });

  it("only gives Settings guidance after a successful load", () => {
    const html = renderStatus("loaded", { enabled: false, buckets: [] });
    expect(html).toContain("Configuración");
    expect(html).not.toContain("Reintentar");
  });
});
