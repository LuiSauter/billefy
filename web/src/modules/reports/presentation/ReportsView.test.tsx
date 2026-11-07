import React, { isValidElement } from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatNumber } from "@/shared/lib/number-format";
import type { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import type { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import type { BudgetDto } from "@/modules/planning/domain/planning.types";
import * as analytics from "../domain/reports-analytics";
import { exportReportAsCsv, exportReportAsJson, exportReportAsPrintable } from "../application/report-export.service";
import { SelectField } from "@/shared/ui/select-field";
import { ReportsView } from "./ReportsView";
import { ReportsHeader } from "./ReportsHeader";
import { ReportsNavTabs, type ReportsTab } from "./ReportsNavTabs";
import { ReportsKpiCards } from "./ReportsKpiCards";
import { ReportGenerationCard } from "./ReportGenerationCard";
import { PopularReportsCard } from "./PopularReportsCard";
import { PeriodConclusionBanner } from "./PeriodConclusionBanner";

vi.mock("@/shared/hooks/use-number-format", () => ({ useNumberFormat: () => formatNumber }));
vi.mock("../application/report-export.service", () => ({
  exportReportAsCsv: vi.fn(), exportReportAsJson: vi.fn(), exportReportAsPrintable: vi.fn(),
}));

// Use the project's node-only harness: inspect real component handlers, retaining
// hook state/memo dependencies across explicit renders. SSR still uses real hooks.
type HookFrame = { slots: unknown[]; cursor: number };
const harness = vi.hoisted(() => ({ frame: null as HookFrame | null }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual,
    useState: (initial: unknown) => {
      const frame = harness.frame;
      if (!frame) return actual.useState(initial);
      const index = frame.cursor++;
      if (!(index in frame.slots)) frame.slots[index] = typeof initial === "function" ? initial() : initial;
      return [frame.slots[index], (next: unknown) => {
        frame.slots[index] = typeof next === "function" ? next(frame.slots[index]) : next;
      }];
    },
    useMemo: (factory: () => unknown, dependencies: readonly unknown[]) => {
      const frame = harness.frame;
      if (!frame) return actual.useMemo(factory, dependencies);
      const index = frame.cursor++;
      const previous = frame.slots[index] as { value: unknown; dependencies?: readonly unknown[] } | undefined;
      if (!previous || !dependencies || dependencies.length !== previous.dependencies?.length ||
        dependencies.some((value, offset) => !Object.is(value, previous.dependencies?.[offset]))) {
        frame.slots[index] = { value: factory(), dependencies };
      }
      return (frame.slots[index] as { value: unknown }).value;
    },
  };
});

const accounts: AccountDto[] = [{
  id: "account", name: "Cuenta de prueba", type: "Savings", currency: "BOB",
  balance: new Decimal(1500), createdAt: "2025-01-01T00:00:00Z",
}];
const transactions: TransactionDto[] = [
  { id: "income", accountId: "account", amount: new Decimal(1000), currency: "BOB",
    direction: "Income", occurredAt: "2026-11-05T00:00:00Z", createdAt: "2026-11-05T00:00:00Z" },
  { id: "expense", accountId: "account", amount: new Decimal(200), currency: "BOB",
    direction: "Expense", occurredAt: "2026-11-06T00:00:00Z", createdAt: "2026-11-06T00:00:00Z" },
  { id: "older-income", accountId: "account", amount: new Decimal(500), currency: "BOB",
    direction: "Income", occurredAt: "2026-09-05T00:00:00Z", createdAt: "2026-09-05T00:00:00Z" },
];
const defaultProps = { transactions, accounts };
let viewFrame: HookFrame;
let generationFrame: HookFrame;

function withHooks<T>(frame: HookFrame, render: () => T): T {
  frame.cursor = 0;
  harness.frame = frame;
  try { return render(); } finally { harness.frame = null; }
}
function render(props: React.ComponentProps<typeof ReportsView> = defaultProps) {
  return withHooks(viewFrame, () => ReportsView(props));
}
function nodes(tree: unknown): React.ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(tree)) return [];
  const children = typeof tree.props.children === "function"
    ? tree.props.children({ id: String(tree.props.label) }) : tree.props.children;
  return [tree, ...nodes(children)];
}
function componentProps<T extends React.ElementType>(tree: unknown, component: T): React.ComponentProps<T> {
  const node = nodes(tree).find((item) => item.type === component);
  if (!node) throw new Error(`Missing component: ${String(component)}`);
  return node.props as React.ComponentProps<T>;
}
function highlighted(tree: React.ReactNode, label: string) {
  return renderToStaticMarkup(tree).includes(`aria-label="${label}" data-highlighted="true"`);
}
function generation(tree = render()) {
  return withHooks(generationFrame, () => ReportGenerationCard(componentProps(tree, ReportGenerationCard)));
}
function changeFormat(format: string) {
  const field = nodes(generation()).find((node) => node.type === SelectField && node.props.id === "Formato")!;
  (field.props.onChange as (event: unknown) => void)({ target: { value: format } });
}
function submitGeneration(tree = render()) {
  const form = nodes(generation(tree)).find((node) => node.type === "form")!;
  (form.props.onSubmit as (event: unknown) => void)({ preventDefault: vi.fn() });
}

beforeEach(() => {
  viewFrame = { slots: [], cursor: 0 };
  generationFrame = { slots: [], cursor: 0 };
  vi.clearAllMocks();
  // Newly generated shared shadcn primitives rely on automatic JSX in Next;
  // the node-only Vitest transform uses classic JSX instead.
  vi.stubGlobal("React", React);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-15T12:00:00Z"));
});
afterEach(() => {
  harness.frame = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ReportsView", () => {
  it("renders all sections, shared controls and authentic calculated values", () => {
    const html = renderToStaticMarkup(<ReportsView {...defaultProps} />);
    for (const heading of ["Reportes", "Ingresos totales", "Gastos totales", "Ahorro / Inversión", "Balance neto",
      "Ingresos vs. Gastos", "Gastos por categoría", "Generar reporte", "Evolución del patrimonio neto",
      "Resumen del período", "Reportes populares", "Conclusión del período"]) {
      expect(html).toContain(heading);
    }
    expect(html).toContain("1.500,00 BOB");
    expect(html).toContain("200,00 BOB");
    expect(html).toContain("1.300,00 BOB");
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain('data-slot="select-field"');
    expect(html).toContain('data-slot="button"');
    expect(componentProps(render(), ReportsHeader).periodMonths).toBe(6);
    expect(componentProps(render(), ReportsNavTabs).activeTab).toBe("overview");
  });

  it.each([1, 3, 6, 12] as const)("recalculates and synchronizes both period controls for %s months", (months) => {
    componentProps(render(), ReportsHeader).onPeriodChange(months);
    let tree = render();
    expect(componentProps(tree, ReportsHeader).periodMonths).toBe(months);
    const generationProps = componentProps(tree, ReportGenerationCard);
    expect(generationProps.periodMonths).toBe(months);
    expect(generationProps.reportData.cashFlowEvolution).toHaveLength(months);
    expect(generationProps.reportData.kpis.totalIncome).toBe(months === 1 ? 1000 : 1500);
    generationProps.onPeriodChange(1);
    tree = render();
    expect(componentProps(tree, ReportsHeader).periodMonths).toBe(1);
    expect(componentProps(tree, ReportsKpiCards).kpis.netBalance).toBe(800);
  });

  it("memoizes calculations and recomputes when financial props change", () => {
    const calculate = vi.spyOn(analytics, "calculateFinancialReport");
    render();
    componentProps(render(), ReportsNavTabs).onTabChange("custom");
    render();
    expect(calculate).toHaveBeenCalledTimes(1);
    const updated = { ...defaultProps, transactions: transactions.slice(0, 2) };
    expect(componentProps(render(updated), ReportsKpiCards).kpis.totalIncome).toBe(1000);
    expect(calculate).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["overview", undefined], ["income-expenses", "Flujo de ingresos y gastos"],
    ["accounts", "Patrimonio de cuentas y préstamos"], ["investments", "Indicadores financieros"],
    ["net-worth", "Patrimonio de cuentas y préstamos"], ["custom", "Generación de reportes"],
  ] as const)("selects navigation %s and emphasizes the related sections", (tab, label) => {
    componentProps(render(), ReportsNavTabs).onTabChange(tab as ReportsTab);
    const tree = render();
    expect(componentProps(tree, ReportsNavTabs).activeTab).toBe(tab);
    if (label) expect(highlighted(tree, label)).toBe(true);
    const html = renderToStaticMarkup(tree);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    if (tab === "investments") expect(html).toContain("no la rentabilidad de inversiones");
  });

  it("exports the current financial summary from the header", () => {
    componentProps(render(), ReportsHeader).onPeriodChange(1);
    const tree = render();
    componentProps(tree, ReportsHeader).onExport?.();
    expect(exportReportAsCsv).toHaveBeenCalledExactlyOnceWith(
      componentProps(tree, ReportGenerationCard).reportData, "financial-summary", "BOB",
    );
    expect(vi.mocked(exportReportAsCsv).mock.calls[0][0].kpis.totalIncome).toBe(1000);
  });

  it.each([
    ["csv", exportReportAsCsv], ["json", exportReportAsJson], ["pdf", exportReportAsPrintable],
  ] as const)("generates %s using the latest period and currency", (format, exporter) => {
    changeFormat(format);
    componentProps(render(), ReportGenerationCard).onPeriodChange(1);
    const tree = render({ ...defaultProps, selectedCurrency: "USD", p2pRate: 10 });
    submitGeneration(tree);
    const report = componentProps(tree, ReportGenerationCard).reportData;
    expect(report.kpis.totalIncome).toBe(100);
    expect(report.cashFlowEvolution).toHaveLength(1);
    expect(exporter).toHaveBeenCalledExactlyOnceWith(report, "financial-summary", "USD");
    expect(renderToStaticMarkup(generation(tree))).toContain('role="status"');
  });

  it("reports header export errors without leaking details and allows retry", () => {
    vi.mocked(exportReportAsCsv).mockImplementationOnce(() => { throw new Error("private details"); });
    componentProps(render(), ReportsHeader).onExport?.();
    const html = renderToStaticMarkup(render());
    expect(html).toContain("No se pudo exportar el reporte");
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("private details");
    componentProps(render(), ReportsHeader).onExport?.();
    expect(renderToStaticMarkup(render())).not.toContain("No se pudo exportar");
  });

  it.each([
    ["monthly-summary", "Resumen mensual", "Indicadores financieros"],
    ["cash-flow", "Flujo de efectivo", "Flujo de ingresos y gastos"],
    ["investment-performance", "Rendimiento de inversiones", "Indicadores financieros"],
    ["net-worth", "Evolución del patrimonio", "Patrimonio de cuentas y préstamos"],
  ])("highlights the selected popular report %s without triggering an export", (id, label, section) => {
    componentProps(render(), PopularReportsCard).onSelectReport?.(id);
    const tree = render();
    const html = renderToStaticMarkup(tree);
    expect(html).toContain(`Reporte seleccionado: ${label}`);
    expect(html).toContain('role="status"');
    expect(highlighted(tree, section)).toBe(true);
    expect(exportReportAsCsv).not.toHaveBeenCalled();
    expect(exportReportAsJson).not.toHaveBeenCalled();
    expect(exportReportAsPrintable).not.toHaveBeenCalled();
    componentProps(tree, ReportsNavTabs).onTabChange("custom");
    const next = render();
    expect(renderToStaticMarkup(next)).not.toContain("Reporte seleccionado:");
    expect(highlighted(next, "Generación de reportes")).toBe(true);
    expect(highlighted(next, section)).toBe(false);
  });

  it("ignores unknown popular report identifiers", () => {
    componentProps(render(), PopularReportsCard).onSelectReport?.("unknown");
    expect(componentProps(render(), ReportsNavTabs).activeTab).toBe("overview");
    expect(renderToStaticMarkup(render())).not.toContain("Reporte seleccionado:");
  });

  it.each([false, true])("navigates recommendations according to financial health (deficit=%s)", (deficit) => {
    const onNavigateToTab = vi.fn();
    const tree = render({ ...defaultProps, onNavigateToTab,
      transactions: deficit ? transactions.filter((transaction) => transaction.direction === "Expense") : transactions });
    componentProps(tree, PeriodConclusionBanner).onViewRecommendations?.();
    expect(onNavigateToTab).toHaveBeenCalledExactlyOnceWith(deficit ? "presupuestos" : "metas");
  });

  it("leaves recommendations disabled when no navigation callback is supplied", () => {
    expect(componentProps(render(), PeriodConclusionBanner).onViewRecommendations).toBeUndefined();
    expect(renderToStaticMarkup(render())).toMatch(/disabled=""[^>]*>Ver recomendaciones/);
  });

  it("passes loans and budgets through the real analytics engine", () => {
    const loans: LoanSummaryDto[] = [{
      id: "loan", counterpartyId: "test", counterpartyName: "Contraparte de prueba", type: "Borrowed",
      template: "NoInterest", status: "Active", principal: new Decimal(100), currency: "BOB",
      interestRate: 0, annualEffectiveRate: 0, remainingPrincipal: new Decimal(100),
      disbursementDate: "2026-01-01", firstDueDate: "2026-02-01", totalInstallments: 12, createdAt: "2026-01-01",
    }];
    const budgets: BudgetDto[] = [{
      id: "budget", period: "Monthly", limitAmount: 100, currency: "BOB", alertThreshold: 0.8,
      spentAmount: 0, remainingAmount: 100, percentageUsed: 0, isAlertTriggered: false,
      isExceeded: false, isActive: true, createdAt: "2026-01-01",
    }];
    const calculate = vi.spyOn(analytics, "calculateFinancialReport");
    const tree = render({ ...defaultProps, loans, budgets });
    expect(calculate).toHaveBeenCalledWith({ ...defaultProps, loans, budgets, periodMonths: 6, selectedCurrency: "BOB", p2pRate: undefined });
    const data = componentProps(tree, ReportGenerationCard).reportData;
    expect(data.netWorthEvolution.at(-1)?.netWorth).toBe(1400);
    expect(data.periodSummary.budgetCompliance).toBe(33.33);
  });

  it("shows loading skeletons instead of stale data, empty messages or exports", () => {
    const calculate = vi.spyOn(analytics, "calculateFinancialReport");
    const tree = render({ ...defaultProps, loading: true });
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Cargando reportes"');
    expect(html.match(/data-slot="skeleton"/g)).toHaveLength(11);
    expect(html).not.toContain("Ingresos totales");
    expect(html).not.toContain("Sin movimientos para analizar");
    expect(componentProps(tree, ReportsHeader).onExport).toBeUndefined();
    expect(calculate).not.toHaveBeenCalled();
    expect(renderToStaticMarkup(render())).toContain("Ingresos totales");
  });

  it("shows a clean empty state with no charts or export for an empty ledger", () => {
    const tree = render({ transactions: [], accounts: [] });
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Sin movimientos para analizar");
    expect(html).toContain('data-slot="empty"');
    expect(html).not.toContain("recharts-responsive-container");
    expect(html).not.toContain("Ingresos totales");
    expect(html).not.toContain("Conclusión del período");
    expect(componentProps(tree, ReportsHeader).onExport).toBeUndefined();
  });

  it("keeps honest period-specific empty charts when transactions are outside the selected window", () => {
    const tree = render({ ...defaultProps, transactions: transactions.slice(2) });
    componentProps(tree, ReportsHeader).onPeriodChange(1);
    const html = renderToStaticMarkup(render({ ...defaultProps, transactions: transactions.slice(2) }));
    expect(html).toContain("Sin movimientos en este período");
    expect(html).toContain("Sin gastos en este período");
    expect(html).toContain("No hay ingresos ni gastos operativos registrados");
    expect(html).not.toContain("Sin movimientos para analizar");
  });

  it("does not fabricate converted values when FX is missing and recovers with a valid rate", () => {
    const props = { ...defaultProps, selectedCurrency: "USD" };
    const tree = render(props);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('role="alert"');
    expect(html).toContain("No se pudo calcular el reporte");
    expect(html).not.toContain("Ingresos totales");
    expect(componentProps(tree, ReportsHeader).onExport).toBeUndefined();
    expect(componentProps(render({ ...props, p2pRate: 10 }), ReportsKpiCards).kpis.totalIncome).toBe(150);
  });
});
