import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Button } from "@/shared/ui/button";
import { WorkspaceDashboardView } from "./WorkspaceDashboardView";
import { calendarFixture, dashboardFixture, goalsFixture, viewNodes, workspaceFixture } from "./workspace-view.fixtures";

const props = () => ({ workspace: workspaceFixture, dashboard: dashboardFixture, goals: goalsFixture, calendar: calendarFixture, viewerUserId: "viewer", onNavigate: vi.fn(), onRegisterExpense: vi.fn() });
describe("WorkspaceDashboardView", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  it("renders the five server KPIs and all shared dashboard panels", () => {
    const html = renderToStaticMarkup(<WorkspaceDashboardView {...props()} />);
    for (const text of ["Balance del espacio", "Bs 875,00", "Ingresos del mes", "Gastos del mes", "Ahorro del mes", "Ejecución del presupuesto", "72.5%", "Presupuesto mensual", "Aportaciones del mes", "Metas compartidas", "Viaje de prueba", "Gastos por categoría", "Próximos pagos", "Internet de prueba", "Balance entre nosotros", "Te deben", "Bs 290,00", "Registrar gasto compartido"]) expect(html).toContain(text);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain("100%");
  });
  it("routes budget detail and expense actions without opening personal finance", () => {
    const input = props();
    const buttons = viewNodes(WorkspaceDashboardView(input)).filter((node) => node.type === Button);
    (buttons.find((node) => node.props["aria-label"] === "Ver presupuesto")!.props.onClick as () => void)();
    (buttons.find((node) => node.props["aria-label"] === "Registrar gasto compartido")!.props.onClick as () => void)();
    expect(input.onNavigate).toHaveBeenCalledWith("presupuesto");
    expect(input.onRegisterExpense).toHaveBeenCalledOnce();
  });
  it("does not invent budgets, goals, payments or settled badges, and honors contribution privacy", () => {
    const html = renderToStaticMarkup(<WorkspaceDashboardView {...props()} workspace={{ ...workspaceFixture, settings: { ...workspaceFixture.settings, showIndividualContributions: false } }} dashboard={{ ...dashboardFixture, budget: null, memberContributions: [], pendingSettlements: [], balances: { pairwiseBalances: [], memberNetBalances: [], settlements: [] }, categoryBreakdown: [] }} goals={[]} calendar={[]} />);
    for (const text of ["Sin presupuesto", "Sin metas activas", "Sin próximos pagos", "Todo al día", "Las aportaciones individuales están ocultas"]) expect(html).toContain(text);
    expect(html).not.toContain("Al día</");
    expect(html).not.toContain("NaN");
  });
});
