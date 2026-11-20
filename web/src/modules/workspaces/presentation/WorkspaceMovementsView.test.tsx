import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/shared/ui/button";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { SelectField } from "@/shared/ui/select-field";
import { Input } from "@/shared/ui/input";
import { WorkspaceMovementsView } from "./WorkspaceMovementsView";
import { dashboardFixture, expensesFixture, goalsFixture, incomesFixture, viewNodes, workspaceFixture } from "./workspace-view.fixtures";

const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[] }));
vi.mock("react", async (load) => {
  const actual = await load<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.slots[index], (next: unknown) => { hooks.slots[index] = typeof next === "function" ? next(hooks.slots[index]) : next; }];
  } };
});
vi.mock("@/modules/ledger/application/CategoriesContext", () => ({ useUserCategories: () => ({ findCategory: (id: string) => id === "food" ? { name: "Alimentación", iconKey: "utensils", colorKey: "rose" } : undefined }) }));
const props = () => ({ workspace: workspaceFixture, dashboard: dashboardFixture, expenses: expensesFixture, incomes: incomesFixture, goals: goalsFixture, year: 2026, month: 10, viewerUserId: "viewer", onRegisterExpense: vi.fn(), onRegisterIncome: vi.fn() });
describe("WorkspaceMovementsView", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => { hooks.cursor = 0; hooks.slots.length = 0; });
  it("renders the shared movement table, KPIs, filters and member metrics from real records", () => {
    const html = renderToStaticMarkup(<WorkspaceMovementsView {...props()} />);
    for (const text of ["Movimientos compartidos", "Registrar ingreso", "Registrar gasto", "Total de movimientos", "Ingresos", "Gastos", "Aportaciones", "Transferencias", "Filtros", "Categoría", "Cuenta", "Participación", "Rango de fechas", "Gastos por integrante", "Por categoría", "Fecha", "Descripción", "Monto", "Compra de prueba", "Sueldo de prueba", "Compartido", "Bs 725,00", "Bs 60,00"]) expect(html).toContain(text);
    expect(html).not.toContain("Bs 90,00");
  });
  it("filters contribution rows and does not fabricate unavailable income or transfer records", () => {
    const input = props();
    const render = () => { hooks.cursor = 0; return WorkspaceMovementsView(input); };
    const toggle = () => viewNodes(render()).find((node) => node.type === SegmentedControl)!;
    (toggle().props.onChange as (value: string) => void)("contribution");
    let html = renderToStaticMarkup(render());
    expect(html).toContain("Aporte a meta: Viaje de prueba");
    expect(html).not.toContain("Compra de prueba");
    (toggle().props.onChange as (value: string) => void)("income");
    html = renderToStaticMarkup(render());
    expect(html).toContain("Sueldo de prueba");
    expect(html).not.toContain("Compra de prueba");
  });
  it("applies category and date filters, validates reversed ranges, and clears all filters", () => {
    const input = props();
    const render = () => { hooks.cursor = 0; return WorkspaceMovementsView(input); };
    const select = (label: string, value: string) => (viewNodes(render()).find((node) => node.type === SelectField && node.props["aria-label"] === label)!.props.onChange as (event: unknown) => void)({ target: { value } });
    select("Categoría", "food");
    expect(renderToStaticMarkup(render())).not.toContain("Aporte a meta: Viaje de prueba");
    select("Rango de fechas", "custom");
    const dates = viewNodes(render()).filter((node) => node.type === Input && node.props.type === "date");
    (dates[0].props.onChange as (event: unknown) => void)({ target: { value: "2026-10-29" } });
    (dates[1].props.onChange as (event: unknown) => void)({ target: { value: "2026-10-20" } });
    let html = renderToStaticMarkup(render());
    expect(html).toContain("La fecha inicial debe ser anterior");
    expect(html).not.toContain("Compra de prueba");
    (viewNodes(render()).find((node) => node.type === Button && node.props.children === "Limpiar")!.props.onClick as () => void)();
    html = renderToStaticMarkup(render());
    expect(html).toContain("Compra de prueba");
    expect(html).toContain("Aporte a meta: Viaje de prueba");
    expect(html).not.toContain("La fecha inicial debe ser anterior");
  });
  it("hides individual contribution rows and member metrics when privacy is enabled", () => {
    const html = renderToStaticMarkup(<WorkspaceMovementsView {...props()} workspace={{ ...workspaceFixture, settings: { ...workspaceFixture.settings, showIndividualContributions: false } }} />);
    expect(html).not.toContain("Aporte a meta: Viaje de prueba");
    expect(html).toContain("Las aportaciones individuales están ocultas");
    expect(html).toContain("Bs 60,00");
  });
  it("isolates month, currency and viewer participation, and wires the register action", () => {
    const input = { ...props(), expenses: [...expensesFixture, { ...expensesFixture[0], id: "old", description: "Fuera de período", date: "2026-09-28" }, { ...expensesFixture[0], id: "usd", description: "Otra moneda", currency: "USD" }] };
    const render = () => { hooks.cursor = 0; return WorkspaceMovementsView(input); };
    const tree = render();
    let html = renderToStaticMarkup(tree);
    expect(html).not.toContain("Fuera de período");
    expect(html).not.toContain("Otra moneda");
    (viewNodes(tree).find((node) => node.type === Button && node.props["aria-label"] === "Registrar gasto")!.props.onClick as () => void)();
    expect(input.onRegisterExpense).toHaveBeenCalledOnce();
    (viewNodes(render()).find((node) => node.type === Button && node.props["aria-label"] === "Registrar ingreso")!.props.onClick as () => void)();
    expect(input.onRegisterIncome).toHaveBeenCalledOnce();
    const participation = viewNodes(render()).find((node) => node.type === SelectField && node.props["aria-label"] === "Participación")!;
    (participation.props.onChange as (event: unknown) => void)({ target: { value: "mine" } });
    html = renderToStaticMarkup(render());
    expect(html).not.toContain("Compra de prueba");
    expect(html).toContain("Aporte a meta: Viaje de prueba");
  });
});
