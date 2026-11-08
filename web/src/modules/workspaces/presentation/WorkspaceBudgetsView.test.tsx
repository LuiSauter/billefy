import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceBudgetsView } from "./WorkspaceBudgetsView";
import { buildWorkspaceBudgetRequest } from "./workspace-budget";
import { Button } from "@/shared/ui/button";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { MoneyInput } from "@/shared/ui/money-input";
import { budgetFixture, viewNodes, workspaceFixture } from "./workspace-view.fixtures";

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
const props = () => ({ workspace: workspaceFixture, budget: budgetFixture, year: 2026, month: 10, viewerUserId: "viewer", onConfigureBudget: vi.fn() });
describe("WorkspaceBudgetsView", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => { hooks.cursor = 0; hooks.slots.length = 0; });
  it("renders budget execution, categories, actual remaining amounts and suggestions", () => {
    const html = renderToStaticMarkup(<WorkspaceBudgetsView {...props()} />);
    for (const text of ["72.5%", "Presupuesto mensual", "Bs 1.000,00", "Bs 725,00", "Bs 275,00", "Regla de aportación", "Partes iguales", "Proporcional", "Personalizado", "Resumen del presupuesto", "Sugerencias", "Presupuesto por categoría", "Disponible", "Uso", "Bs 25,00", "96.7%", "cerca del límite"]) expect(html).toContain(text);
    expect(html).toContain('role="progressbar"');
  });
  it("opens configuration for the selected workspace and handles absent budgets truthfully", () => {
    const input = { ...props(), budget: null };
    const tree = WorkspaceBudgetsView(input);
    const button = viewNodes(tree).find((node) => node.type === Button && node.props["aria-label"] === "Configurar presupuesto")!;
    (button.props.onClick as () => void)();
    expect(input.onConfigureBudget).toHaveBeenCalledOnce();
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Sin presupuesto");
    expect(html).not.toContain("NaN");
  });
  it("previews equal, proportional and custom contributions without pretending to save a rule", () => {
    const input = props();
    const render = () => { hooks.cursor = 0; return WorkspaceBudgetsView(input); };
    const choose = (value: string) => (viewNodes(render()).find((node) => node.type === SegmentedControl)!.props.onChange as (value: string) => void)(value);
    expect(renderToStaticMarkup(render())).toContain("Bs 500,00");
    choose("IncomeProportional");
    let html = renderToStaticMarkup(render());
    expect(html).toContain("Bs 600,00");
    expect(html).toContain("Bs 400,00");
    expect(html).toContain("no modifica la regla");
    choose("CustomPercentage");
    expect(renderToStaticMarkup(render())).toContain("Los porcentajes deben sumar 100%");
    const inputs = viewNodes(render()).filter((node) => node.type === MoneyInput);
    (inputs[0].props.onValueChange as (value: string) => void)("70");
    (inputs[1].props.onValueChange as (value: string) => void)("30");
    html = renderToStaticMarkup(render());
    expect(html).toContain("Bs 700,00");
    expect(html).toContain("Bs 300,00");
    expect(html).not.toContain("Los porcentajes deben sumar");
    expect(input.onConfigureBudget).not.toHaveBeenCalled();
  });
  it("preserves overspending while clamping the visual progress indicator", () => {
    const html = renderToStaticMarkup(<WorkspaceBudgetsView {...props()} budget={{ ...budgetFixture, spentAmount: 1500, remainingAmount: -500, executionPercentage: 150 }} />);
    expect(html).toContain("150%");
    expect(html).toContain("Bs -500,00");
    expect(html).toContain("Has superado el presupuesto");
    expect(html).not.toContain("NaN");
  });
  it("validates decimal category limits, duplicates and total before sending an API request", () => {
    const draft = { amount: "0.30", categories: [{ categoryId: "food", limitAmount: "0.10" }, { categoryId: "home", limitAmount: "0.20" }] };
    expect(buildWorkspaceBudgetRequest(draft, 2026, 10, "BOB")).toEqual({ year: 2026, month: 10, currency: "BOB", amount: 0.3, categories: [{ categoryId: "food", limitAmount: 0.1 }, { categoryId: "home", limitAmount: 0.2 }] });
    expect(buildWorkspaceBudgetRequest({ amount: "100", categories: [{ categoryId: "food", limitAmount: "0" }] }, 2026, 10, "BOB").categories).toEqual([{ categoryId: "food", limitAmount: 0 }]);
    for (const patch of [{ amount: "0" }, { amount: "NaN" }, { amount: "0.001" }, { amount: "0.29" }, { categories: [{ categoryId: "food", limitAmount: "1" }, { categoryId: "food", limitAmount: "1" }] }]) expect(() => buildWorkspaceBudgetRequest({ ...draft, ...patch }, 2026, 10, "BOB")).toThrow();
  });
});
