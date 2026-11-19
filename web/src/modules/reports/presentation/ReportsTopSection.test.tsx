import React, { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_FONT_SIZE } from "@/shared/lib/chart-utils";
import { formatNumber } from "@/shared/lib/number-format";
import { ChartTooltipContent } from "@/shared/ui/chart";
import { Button } from "@/shared/ui/button";
import { SelectField } from "@/shared/ui/select-field";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import type { FinancialReport } from "../domain/reports-analytics";
import { ReportsHeader } from "./ReportsHeader";
import { ReportsNavTabs, type ReportsTab } from "./ReportsNavTabs";
import { ReportsKpiCards } from "./ReportsKpiCards";
import { IncomeVsExpensesChartCard } from "./IncomeVsExpensesChartCard";
import { CategoryExpensesDonutCard } from "./CategoryExpensesDonutCard";

// Keep the node-only runner; use the same default decimal formatter as the hook.
vi.mock("@/shared/hooks/use-number-format", () => ({ useNumberFormat: () => formatNumber, useNumberPreferences: () => ({ convention: "es-BO", decimalPlaces: 2 }) }));
// Observe chart wiring (children/props) without replacing Recharts.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: vi.fn((props: React.ComponentProps<typeof actual.ResponsiveContainer>) => (
      <actual.ResponsiveContainer {...props} />
    )),
  };
});
function chartContainer() {
  const call = vi.mocked(ResponsiveContainer).mock.calls.at(-1);
  if (!call) throw new Error("Expected a responsive chart");
  return call[0];
}
/** Renders the tooltip row a chart's shared ChartTooltipContent would produce for a hovered item. */
function tooltipRow(tree: unknown, value: number, name: string, payload: Record<string, unknown>) {
  const content = propsOf(tree, Tooltip).content as React.ReactElement<{ formatter: (...args: unknown[]) => React.ReactNode }>;
  expect(content.type).toBe(ChartTooltipContent);
  return renderToStaticMarkup(<>{content.props.formatter(value, name, { payload, color: "#a855f7" })}</>);
}

function nodes(tree: unknown): React.ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(tree)) return [];
  return [tree, ...nodes(tree.props.children)];
}
function propsOf(tree: unknown, type: unknown) {
  const node = nodes(tree).find((item) => item.type === type);
  if (!node) throw new Error("Expected component was not rendered");
  return node.props;
}
const kpis: FinancialReport["kpis"] = {
  totalIncome: 40800, incomeGrowthPct: 12.6,
  totalExpenses: 24520, expensesGrowthPct: 5.2,
  savingsAndInvestments: 16280, savingsGrowthPct: 28.4,
  netBalance: 16280, netBalanceGrowthPct: 18.7,
};
const cashFlow: FinancialReport["cashFlowEvolution"] = [
  { month: "Sep", monthKey: "2026-09", income: 4000.25, expenses: 1500.1, net: 2500.15 },
  { month: "Oct", monthKey: "2026-10", income: 6800, expenses: 4120, net: 2680 },
];
const categories: FinancialReport["categoryExpenses"] = [
  { category: "Vivienda", amount: 7000, percentage: 70 },
  { category: "Alimentación", amount: 3000, percentage: 30 },
];

describe("Reports top section", () => {
  it("renders the report heading, period options and export action using shared controls", () => {
    const html = renderToStaticMarkup(<ReportsHeader periodMonths={6} onPeriodChange={vi.fn()} onExport={vi.fn()} />);
    expect(html).toContain("Reportes");
    expect(html).toContain("Analiza tu salud financiera con informes detallados, tendencias y métricas clave.");
    for (const label of ["Este mes", "Últimos 3 meses", "Últimos 6 meses", "Último año", "Exportar reporte"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('value="6" selected');
    expect(html).toContain('data-slot="select-field"');
    expect(html).toContain('data-slot="button"');
  });

  it.each([1, 3, 6, 12] as const)("emits numeric period %s and forwards export", (period) => {
    const onPeriodChange = vi.fn();
    const onExport = vi.fn();
    const tree = ReportsHeader({ periodMonths: 6, onPeriodChange, onExport });
    const select = propsOf(tree, SelectField);
    (select.onChange as (event: unknown) => void)({ target: { value: String(period) } });
    expect(onPeriodChange).toHaveBeenCalledExactlyOnceWith(period);
    (propsOf(tree, Button).onClick as () => void)();
    expect(onExport).toHaveBeenCalledOnce();
  });

  it("disables export until an export handler is provided", () => {
    const tree = ReportsHeader({ periodMonths: 1, onPeriodChange: vi.fn() });
    expect(propsOf(tree, Button).disabled).toBe(true);
  });

  it("renders all six navigation choices and reflects the controlled active tab", () => {
    const onTabChange = vi.fn();
    const tree = ReportsNavTabs({ activeTab: "accounts", onTabChange });
    const html = renderToStaticMarkup(tree);
    for (const label of ["Vista general", "Ingresos y gastos", "Cuentas", "Inversiones", "Patrimonio", "Personalizado"]) {
      expect(html).toContain(label);
    }
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-checked="true"[^>]*>.*?Cuentas/);
    const control = propsOf(tree, SegmentedControl);
    expect(control.value).toBe("accounts");
    for (const tab of ["overview", "income-expenses", "accounts", "investments", "net-worth", "custom"] as ReportsTab[]) {
      (control.onChange as (value: ReportsTab) => void)(tab);
      expect(onTabChange).toHaveBeenLastCalledWith(tab);
    }
  });

  it.each(["BOB", "USD", "USDT"])("renders actual KPI values in selected currency %s without conversion or invented growth", (selectedCurrency) => {
    const html = renderToStaticMarkup(<ReportsKpiCards kpis={kpis} selectedCurrency={selectedCurrency} />);
    for (const label of ["Ingresos totales", "Gastos totales", "Ahorro / Inversión", "Balance neto"]) expect(html).toContain(label);
    const money = (value: string) => selectedCurrency === "BOB" ? `Bs ${value}` : selectedCurrency === "USD" ? `$ ${value}` : `${value} USDT`;
    expect(html).toContain(money("40.800,00"));
    expect(html).toContain(money("24.520,00"));
    expect(html).toContain(money("16.280,00"));
    for (const growth of ["+12,60%", "+5,20%", "+28,40%", "+18,70%"]) expect(html).toContain(growth);
    expect(html.match(/data-slot="card"/g)).toHaveLength(4);
  });

  it("shows negative balances and growth, and neutral zero growth accurately", () => {
    const html = renderToStaticMarkup(<ReportsKpiCards selectedCurrency="USD" kpis={{ ...kpis,
      totalIncome: 0, incomeGrowthPct: 0, expensesGrowthPct: -5.2,
      netBalance: -1200.125, netBalanceGrowthPct: -18.7,
    }} />);
    expect(html).toContain("-$ 1.200,13");
    expect(html).toContain("-18,70%");
    expect(html).toContain("-5,20%");
    expect(html).toContain(">+0,00%</span>");
  });

  it("shows '—' instead of a fabricated 0% when there is no prior-period baseline", () => {
    const html = renderToStaticMarkup(<ReportsKpiCards selectedCurrency="BOB" kpis={{ ...kpis,
      incomeGrowthPct: null, expensesGrowthPct: null, savingsGrowthPct: 0, netBalanceGrowthPct: 10 }} />);
    expect(html.match(/>—<\/span>/g)).toHaveLength(2);
    expect(html.match(/>\+0,00%<\/span>/g)).toHaveLength(1); // a genuine zero change is still shown
    expect(html).toContain("+10,00%");
  });

  it("uses shared Badge variants for icon tones and lays out by container width", () => {
    const html = renderToStaticMarkup(<ReportsKpiCards kpis={kpis} selectedCurrency="BOB" />);
    expect(html.match(/data-slot="badge"/g)).toHaveLength(8);
    expect(html).not.toContain("bg-teal-500/15");
    expect(html).toContain("@container");
    expect(html).not.toMatch(/(^|[\s"])xl:grid-cols-4/);
  });

  it("renders chronological monthly bars with compact Y-axis ticks and the shared swatch tooltip", () => {
    vi.mocked(ResponsiveContainer).mockClear();
    const html = renderToStaticMarkup(<IncomeVsExpensesChartCard data={cashFlow} selectedCurrency="USD" />);
    const tree = chartContainer().children;
    expect(propsOf(tree, BarChart).data).toEqual(cashFlow);
    const bars = nodes(tree).filter((node) => node.type === Bar);
    expect(bars.map((node) => node.props.dataKey)).toEqual(["income", "expenses"]);
    expect(bars[0].props.fill).not.toBe(bars[1].props.fill);
    expect(propsOf(tree, XAxis).dataKey).toBe("month");
    // Y axis: shared compact formatter and axis props (same font size as every other chart).
    const yAxis = propsOf(tree, YAxis);
    const tick = yAxis.tickFormatter as (value: number) => string;
    expect([6000, 4500, 1500, 0, -1500, 1_250_000].map(tick)).toEqual(["6K", "4,5K", "1,5K", "0", "-1,5K", "1,3M"]);
    expect(yAxis.fontSize).toBe(CHART_FONT_SIZE);
    expect(yAxis.tickLine).toBe(false);
    expect(yAxis.axisLine).toBe(false);
    expect(propsOf(tree, XAxis).fontSize).toBe(CHART_FONT_SIZE);
    // Tooltip: shared ChartTooltipContent with series swatch, label and full-precision amount.
    const row = tooltipRow(tree, 4000.25, "Ingresos", {});
    expect(row).toContain("Ingresos");
    expect(row).toContain("$ 4.000,25");
    expect(row).toContain("background-color:#a855f7");
    const content = propsOf(tree, Tooltip).content as React.ReactElement<{ labelFormatter: (label: string, payload: unknown[]) => string }>;
    expect(content.props.labelFormatter("Oct", [{ payload: cashFlow[1] }])).toBe("2026-10");
    expect(html).toContain("Ingresos vs. Gastos");
    expect(html).toContain("recharts-responsive-container");
    expect(html).toContain("2026-09");
    expect(html).toContain("$ 4.000,25");
    expect(html).toContain("$ 1.500,10");
    expect(html).not.toContain("6.000,00");
  });

  it("renders the donut, supplied total and every category's amount and percentage", () => {
    vi.mocked(ResponsiveContainer).mockClear();
    const html = renderToStaticMarkup(<CategoryExpensesDonutCard data={categories} totalExpenses={10000} selectedCurrency="BOB" />);
    const tree = chartContainer().children;
    const pie = propsOf(tree, Pie);
    expect(pie.dataKey).toBe("amount");
    expect(pie.nameKey).toBe("name");
    expect(pie.innerRadius).toBeTruthy();
    expect((pie.data as { name: string; amount: number; percentage: number }[]).map(({ name, amount, percentage }) => ({ name, amount, percentage })))
      .toEqual([{ name: "Vivienda", amount: 7000, percentage: 70 }, { name: "Alimentación", amount: 3000, percentage: 30 }]);
    expect(propsOf(tree, PieChart)["aria-label"]).toContain("BOB");
    const fills = nodes(tree).filter((node) => node.type === Cell).map((node) => node.props.fill);
    expect(fills).toHaveLength(categories.length);
    expect(new Set(fills).size).toBe(categories.length);
    const row = tooltipRow(tree, 7000, "Vivienda", { name: "Vivienda", percentage: 70, fill: fills[0] });
    expect(row).toContain("Vivienda");
    expect(row).toContain("Bs 7.000,00 (70,00%)");
    expect(row).toContain(`background-color:${String(fills[0])}`);
    for (const value of ["Gastos por categoría", "Total de gastos", "Bs 10.000,00", "Vivienda", "Alimentación", "70,00%", "30,00%", "Bs 7.000,00", "Bs 3.000,00", "recharts-responsive-container"]) {
      expect(html).toContain(value);
    }
  });

  it("lays out the donut by its own container width, not the viewport", () => {
    const html = renderToStaticMarkup(<CategoryExpensesDonutCard data={categories} totalExpenses={10000} selectedCurrency="BOB" />);
    expect(html).toContain("@container");
    expect(html).toContain("@lg:flex-row");
    expect(html).not.toMatch(/(^|[\s"])(sm|lg|2xl):flex-(row|col)/);
  });

  it("never renders a raw category identifier as a label", () => {
    const html = renderToStaticMarkup(<CategoryExpensesDonutCard
      data={[{ category: "Sin categoría", amount: 10, percentage: 100 }]} totalExpenses={10} selectedCurrency="BOB" />);
    expect(html).toContain("Sin categoría");
  });

  it("shows honest empty states without fabricating chart points or categories", () => {
    const bars = renderToStaticMarkup(<IncomeVsExpensesChartCard data={[]} selectedCurrency="USD" />);
    const donut = renderToStaticMarkup(<CategoryExpensesDonutCard data={[]} totalExpenses={0} selectedCurrency="USD" />);
    expect(bars).toContain("Sin movimientos en este período");
    expect(donut).toContain("Sin gastos en este período");
    expect(donut).toContain("$ 0,00");
    expect(donut).not.toContain("recharts-responsive-container");
  });

  it("does not invent activity for a zero-filled reporting period", () => {
    const data = cashFlow.map((point) => ({ ...point, income: 0, expenses: 0, net: 0 }));
    const html = renderToStaticMarkup(<IncomeVsExpensesChartCard data={data} selectedCurrency="BOB" />);
    expect(html).toContain("Sin movimientos en este período");
    expect(html).not.toContain("recharts-responsive-container");
  });

  it("keeps arbitrary categories and fractional percentages without substituting sample categories", () => {
    const html = renderToStaticMarkup(<CategoryExpensesDonutCard
      data={[{ category: "Educación continua", amount: 0.300003, percentage: 28.57 }]}
      totalExpenses={1.05} selectedCurrency="USDT"
    />);
    expect(html).toContain("Educación continua");
    expect(html).toContain("28,57%");
    expect(html).toContain("0,30 USDT");
    expect(html).toContain("1,05 USDT");
    expect(html).not.toContain("Vivienda");
  });
});
