import React, { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FinancialReport } from "../domain/reports-analytics";
import { Button } from "@/shared/ui/button";
import { SelectField } from "@/shared/ui/select-field";
import { ReportGenerationCard } from "./ReportGenerationCard";
import { exportReportAsCsv, exportReportAsJson, exportReportAsPrintable, type ReportType } from "../application/report-export.service";

// Match the existing node-only component test harness; no DOM package required.
const { slots } = vi.hoisted(() => ({ slots: [] as unknown[] }));
let cursor = 0;
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], (next: unknown) => { slots[index] = next; }];
  } };
});

const report: FinancialReport = {
  kpis: { totalIncome: 1000.123456, incomeGrowthPct: 10, totalExpenses: 400,
    expensesGrowthPct: -2, savingsAndInvestments: 600.123456, savingsGrowthPct: 20,
    netBalance: 600.123456, netBalanceGrowthPct: 20 },
  cashFlowEvolution: [
    { month: "Oct", monthKey: "2026-10", income: 300, expenses: 100, net: 200 },
    { month: "Nov", monthKey: "2026-11", income: 700.123456, expenses: 300, net: 400.123456 },
  ],
  categoryExpenses: [{ category: 'Educación, "cursos"\ncontinuos', amount: 400, percentage: 100 }],
  netWorthEvolution: [
    { month: "Oct", monthKey: "2026-10", netWorth: -100 },
    { month: "Nov", monthKey: "2026-11", netWorth: 500.123456 },
  ],
  periodSummary: { savingsRatio: 60, netWorthGrowthPct: 20, debtRatio: 10, budgetCompliance: 80 },
  conclusion: { title: "Conclusión del período", narrative: "Datos de prueba", healthStatus: "good" },
};

function nodes(tree: unknown): React.ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(tree)) return [];
  const children = typeof tree.props.children === "function"
    ? tree.props.children({ id: String(tree.props.label) }) : tree.props.children;
  return [tree, ...nodes(children)];
}
function control(tree: unknown, label: string) {
  const node = nodes(tree).find((item) => item.type === SelectField && item.props.id === label);
  if (!node) throw new Error(`Missing field: ${label}`);
  return node.props;
}
const onPeriodChange = vi.fn();
function render(periodMonths: 1 | 3 | 6 | 12 = 6, reportData = report) {
  cursor = 0;
  return ReportGenerationCard({ reportData, selectedCurrency: "USD", periodMonths, onPeriodChange });
}
function change(label: string, value: string) {
  (control(render(), label).onChange as (event: unknown) => void)({ target: { value } });
}
function submit() {
  const form = nodes(render()).find((item) => item.type === "form")!;
  (form.props.onSubmit as (event: unknown) => void)({ preventDefault: vi.fn() });
}

const anchor = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
const popup = { opener: {}, document: { open: vi.fn(), write: vi.fn(), close: vi.fn() }, focus: vi.fn(), print: vi.fn() };
let blobs: Blob[];
const createObjectURL = vi.fn((blob: Blob) => { blobs.push(blob); return "blob:report"; });
const revokeObjectURL = vi.fn();
const openWindow = vi.fn(() => popup);

beforeEach(() => {
  slots.splice(0);
  blobs = [];
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.stubGlobal("document", { createElement: vi.fn(() => anchor), body: { appendChild: vi.fn() } });
  vi.stubGlobal("window", { open: openWindow });
  vi.spyOn(URL, "createObjectURL").mockImplementation(createObjectURL);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(revokeObjectURL);
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ReportGenerationCard", () => {
  it("renders accessible shared fields, all options and the purple download action", () => {
    const html = renderToStaticMarkup(render());
    for (const text of ["Generar reporte", "Tipo de reporte", "Período", "Formato", "Resumen financiero", "Flujo de efectivo", "Gastos por categoría", "Evolución del patrimonio", "Últimos 6 meses", "Últimos 3 meses", "Este mes", "Último año", "PDF", "CSV", "JSON"]) {
      expect(html).toContain(text);
    }
    expect(html.match(/data-slot="select-field"/g)).toHaveLength(3);
    expect(html.match(/data-slot="form-field"/g)).toHaveLength(3);
    expect(html).toContain('data-slot="card"');
    expect(html).toContain('value="6" selected');
    expect(html).toContain("from-purple-600");
    expect(html).toContain("lucide-file-text");
    expect(html).toContain("lucide-download");
    expect(nodes(render()).find((item) => item.type === Button)?.props.type).toBe("submit");
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it.each([1, 3, 6, 12] as const)("requests recalculation for period %s rather than slicing aggregate KPIs", (months) => {
    change("Período", String(months));
    expect(onPeriodChange).toHaveBeenCalledExactlyOnceWith(months);
    expect(control(render(months), "Período").value).toBe(String(months));
  });

  it.each(["csv", "json", "pdf"])("exports the chosen type as %s with visible feedback", async (format) => {
    change("Tipo de reporte", "cash-flow");
    change("Formato", format);
    expect(control(render(), "Tipo de reporte").value).toBe("cash-flow");
    expect(control(render(), "Formato").value).toBe(format);
    submit();
    const html = renderToStaticMarkup(render());
    expect(html).toContain('role="status"');
    if (format === "pdf") {
      expect(openWindow).toHaveBeenCalledOnce();
      expect(popup.print).toHaveBeenCalledOnce();
      expect(popup.document.write.mock.calls[0][0]).toContain("Flujo de efectivo");
      expect(createObjectURL).not.toHaveBeenCalled();
    } else {
      expect(anchor.click).toHaveBeenCalledOnce();
      expect(anchor.download).toBe(`flujo-de-efectivo-2026-11.${format}`);
      expect(await blobs[0].text()).toContain("700.123456");
    }
  });

  it("uses the newly calculated report after a controlled period change", async () => {
    change("Formato", "json");
    change("Período", "1");
    const updated = { ...report, kpis: { ...report.kpis, totalIncome: 42 }, cashFlowEvolution: report.cashFlowEvolution.slice(-1) };
    const form = nodes(render(1, updated)).find((item) => item.type === "form")!;
    (form.props.onSubmit as (event: unknown) => void)({ preventDefault: vi.fn() });
    expect(JSON.parse(await blobs[0].text()).data.kpis.totalIncome).toBe(42);
  });

  it("reports blocked print windows honestly and allows retry without exposing exception data", () => {
    openWindow.mockReturnValueOnce(null as unknown as typeof popup);
    submit();
    expect(renderToStaticMarkup(render())).toContain('role="alert"');
    expect(renderToStaticMarkup(render())).not.toContain('role="status"');
    submit();
    expect(popup.print).toHaveBeenCalledOnce();
    expect(renderToStaticMarkup(render())).not.toContain('role="alert"');
  });

  it("shows an error when a browser download fails", () => {
    change("Formato", "csv");
    anchor.click.mockImplementationOnce(() => { throw new Error("sensitive diagnostic"); });
    submit();
    const html = renderToStaticMarkup(render());
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("sensitive diagnostic");
    expect(anchor.remove).toHaveBeenCalledOnce();
    vi.runOnlyPendingTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report");
  });
});

describe("report export service", () => {
  it("downloads real structured CSV with exact values, metadata, all sections and escaped cells", async () => {
    exportReportAsCsv(report, "financial-summary", "USD");
    expect(blobs[0].type).toBe("text/csv;charset=utf-8");
    const csv = await blobs[0].text();
    for (const value of ["USD", "2026-10", "2026-11", "Indicador", "Ingresos totales", "1000.123456", "Flujo de efectivo", "Gastos por categoría", "Evolución del patrimonio", "-100", "Ratio de ahorro", '"Educación, ""cursos""\ncontinuos"']) expect(csv).toContain(value);
    expect(anchor.href).toBe("blob:report");
    expect(anchor.download).toBe("reporte-financiero-2026-11.csv");
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runOnlyPendingTimers();
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:report");
  });

  it.each(["cash-flow", "category-expenses", "net-worth"] as ReportType[])("limits JSON to the requested %s dataset", async (type) => {
    exportReportAsJson(report, type, "BOB");
    const text = await blobs[0].text();
    const json = JSON.parse(text);
    const key = { "cash-flow": "cashFlowEvolution", "category-expenses": "categoryExpenses", "net-worth": "netWorthEvolution" }[type as "cash-flow" | "category-expenses" | "net-worth"];
    expect(json).toMatchObject({ reportType: type, currency: "BOB", period: { from: "2026-10", to: "2026-11" }, data: { [key]: report[key as keyof FinancialReport] } });
    expect(Object.keys(json.data)).toEqual([key]);
    expect(text).toContain('\n  "reportType"');
    expect(blobs[0].type).toBe("application/json;charset=utf-8");
  });

  it("preserves the full financial summary in JSON without mutating it", async () => {
    const original = JSON.stringify(report);
    exportReportAsJson(report, "financial-summary", "USDT");
    expect(JSON.parse(await blobs[0].text()).data).toEqual(report);
    expect(JSON.stringify(report)).toBe(original);
  });

  it("neutralizes spreadsheet formulas in text, without altering negative monetary values", async () => {
    exportReportAsCsv({ ...report, categoryExpenses: [{ category: '=HYPERLINK("unsafe")', amount: -1.000001, percentage: 100 }] }, "category-expenses", "USD");
    const csv = await blobs[0].text();
    expect(csv).toContain('"\'=HYPERLINK(""unsafe"")"');
    expect(csv).toContain('"-1.000001"');
    expect(csv).not.toContain("Ingresos totales");
  });

  it("prints structured tables with escaped user text and no injected markup", () => {
    exportReportAsPrintable({ ...report, categoryExpenses: [{ category: '<script>alert("x")</script>&', amount: 400, percentage: 100 }] }, "financial-summary", "USD");
    const html = popup.document.write.mock.calls[0][0] as string;
    for (const text of ["<table>", "<th", "Ingresos totales", "1000.123456", "USD", "2026-11", "Patrimonio neto", "&lt;script&gt;", "&amp;"]) expect(html).toContain(text);
    expect(html).not.toContain("<script>");
    expect(popup.opener).toBeNull();
    expect(popup.document.close).toHaveBeenCalledOnce();
    expect(popup.print).toHaveBeenCalledOnce();
  });

  it("exports empty data honestly with a safe filename and explicit missing period", async () => {
    const empty = { ...report, cashFlowEvolution: [], categoryExpenses: [], netWorthEvolution: [] };
    exportReportAsJson(empty, "financial-summary", "USD");
    expect(anchor.download).toBe("reporte-financiero-sin-periodo.json");
    expect(JSON.parse(await blobs[0].text()).period).toEqual({ from: null, to: null });
    exportReportAsPrintable(empty, "category-expenses", "USD");
    expect(popup.document.write.mock.calls[0][0]).toContain("Sin datos en este período");
  });
});
