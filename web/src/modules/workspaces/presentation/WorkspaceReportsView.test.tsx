import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/shared/ui/button";
import { SelectField } from "@/shared/ui/select-field";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { viewNodes } from "./workspace-view.fixtures";
import { WorkspaceReportsView } from "./WorkspaceReportsView";
import { reportCsv, reportBalance, downloadWorkspaceReport } from "./workspace-reports";
import type { WorkspaceMonthlyReportDto } from "../domain/workspaces.types";

const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[] }));
vi.mock("react", async (load) => {
  const actual = await load<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [hooks.slots[index], (next: unknown) => { hooks.slots[index] = next; }];
  } };
});
vi.mock("@/shared/ui/responsive-drawer", () => ({ ResponsiveDrawer: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => <div>{children}{footer}</div> }));
const reportFixture: WorkspaceMonthlyReportDto = { year: 2026, month: 10, currency: "BOB", income: 0, expenses: 0.1, savings: 0.2, previousMonthIncome: 0, previousMonthExpenses: 100, expenseChangePercentage: -99.9, categoryBreakdown: [{ categoryId: null, amount: 0.1, percentage: 100 }] };
vi.mock("@/modules/ledger/application/CategoriesContext", () => ({ useUserCategories: () => ({ findCategory: () => undefined }) }));
describe("WorkspaceReportsView", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => { hooks.cursor = 0; hooks.slots.length = 0; });
  it("renders server reports, honest two-month trends and available exports", () => {
    const html = renderToStaticMarkup(<WorkspaceReportsView report={reportFixture} onPeriodChange={vi.fn()} />);
    for (const text of ["Ingresos", "Gastos", "Aportaciones", "Balance del período", "Evolución de ingresos y gastos", "Gastos por categoría", "Reportes generados", "Ver", "Descargar", "JSON", "CSV", "Exportar reporte", "no registra ingresos"]) expect(html).toContain(text);
    expect(html).not.toContain("NaN");
    expect(reportBalance(reportFixture).toFixed(2)).toBe("-0.10");
  });
  it("switches comparison and previews the selected report type", () => {
    const render = () => { hooks.cursor = 0; return WorkspaceReportsView({ report: reportFixture, onPeriodChange: vi.fn() }); };
    const select = viewNodes(render()).find((node) => node.type === SelectField)!;
    (select.props.onChange as (event: unknown) => void)({ target: { value: "none" } });
    expect(renderToStaticMarkup(render())).not.toContain("-99.9% vs.");
    const categoryView = viewNodes(render()).filter((node) => node.type === Button && Array.isArray(node.props.children) && node.props.children.includes("Ver"))[1];
    (categoryView.props.onClick as () => void)();
    const drawer = viewNodes(render()).find((node) => node.type === ResponsiveDrawer)!;
    expect(drawer.props.title).toBe("Gastos por categoría");
    expect(renderToStaticMarkup(drawer)).toContain("categories");
  });
  it("serializes exact decimal values and escapes CSV formula injection", () => {
    const csv = reportCsv({ ...reportFixture, categoryBreakdown: [{ categoryId: '=HYPERLINK("x")', amount: 0.1, percentage: 100 }] });
    expect(csv).toContain("0.1");
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('""x""');
  });
  it("downloads a client-generated report and releases the object URL", () => {
    const click = vi.fn();
    const createObjectURL = vi.fn(() => "blob:report");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("document", { createElement: () => ({ click, href: "", download: "" }) });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    downloadWorkspaceReport(reportFixture, "json");
    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report");
  });
});
