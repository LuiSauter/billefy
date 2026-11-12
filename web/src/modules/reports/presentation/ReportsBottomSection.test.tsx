import React, { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { formatNumber } from "@/shared/lib/number-format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { FinancialReport } from "../domain/reports-analytics";
import { NetWorthEvolutionChartCard } from "./NetWorthEvolutionChartCard";
import { PeriodSummaryMetricsCard } from "./PeriodSummaryMetricsCard";
import { PopularReportsCard } from "./PopularReportsCard";
import { PeriodConclusionBanner } from "./PeriodConclusionBanner";

vi.mock("@/shared/hooks/use-number-format", () => ({ useNumberFormat: vi.fn(() => formatNumber), useNumberPreferences: vi.fn(() => ({ convention: "es-BO", decimalPlaces: 2 })) }));
// Observe chart wiring without replacing Recharts or requiring a browser runner.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: vi.fn((props: React.ComponentProps<typeof actual.ResponsiveContainer>) => (
      <actual.ResponsiveContainer {...props} />
    )),
  };
});

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
function chartContainer() {
  const call = vi.mocked(ResponsiveContainer).mock.calls.at(-1);
  if (!call) throw new Error("Expected a responsive chart");
  return call[0];
}
const evolution: FinancialReport["netWorthEvolution"] = [
  { month: "Sep", monthKey: "2026-09", netWorth: 120000.125 },
  { month: "Oct", monthKey: "2026-10", netWorth: 126540 },
];
const summary: FinancialReport["periodSummary"] = {
  savingsRatio: 27.8, netWorthGrowthPct: 8.4, debtRatio: 20, budgetCompliance: 92.4,
};
const conclusion: FinancialReport["conclusion"] = {
  title: "Conclusión del período", narrative: "Tu patrimonio creció 8.4%. Revisa los gastos de educación.", healthStatus: "good",
};

beforeEach(() => vi.clearAllMocks());

describe("NetWorthEvolutionChartCard", () => {
  it.each(["BOB", "USD", "USDT"])("shows the latest supplied value and accessible monthly history in %s", (selectedCurrency) => {
    const html = renderToStaticMarkup(<NetWorthEvolutionChartCard data={evolution} selectedCurrency={selectedCurrency} />);
    expect(html).toContain("Evolución del patrimonio neto");
    const symbol = selectedCurrency === "BOB" ? "Bs" : selectedCurrency === "USD" ? "$" : "USDT";
    const formatted = (value: string) => selectedCurrency === "USDT" ? `${value} USDT` : `${symbol} ${value}`;
    expect(html).toContain(formatted("126.540,00"));
    expect(html).toContain(formatted("120.000,13"));
    expect(html).toContain("2026-09");
    expect(html).toContain("2026-10");
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain("recharts-responsive-container");
  });

  it("wires a responsive purple area, chronological axis and currency tooltip to actual data", () => {
    renderToStaticMarkup(<NetWorthEvolutionChartCard data={evolution} selectedCurrency="USD" />);
    const container = chartContainer();
    expect(container.minWidth).toBe(0);
    const tree = container.children;
    expect(propsOf(tree, AreaChart).data).toEqual(evolution);
    expect(propsOf(tree, XAxis).dataKey).toBe("month");
    const area = propsOf(tree, Area);
    expect(area.dataKey).toBe("netWorth");
    expect(area.stroke).toBe("#a855f7");
    const gradient = nodes(tree).find((node) => node.type === "linearGradient");
    expect(gradient).toBeDefined();
    expect(area.fill).toBe(`url(#${gradient!.props.id})`);
    expect(nodes(gradient).filter((node) => node.type === "stop")).toHaveLength(2);
    const tooltip = propsOf(tree, Tooltip);
    const formatter = tooltip.formatter as (value: number | undefined) => string;
    expect(formatter(126540)).toBe("$ 126.540,00");
    expect(formatter(-1200.125)).toBe("-$ 1.200,13");
    expect(formatter(undefined)).toBe("");
    const labelFormatter = tooltip.labelFormatter as (label: string, payload: unknown[]) => string;
    expect(labelFormatter("Oct", [{ payload: evolution[1] }])).toBe("2026-10");
  });

  it("respects the user's number formatting preferences", () => {
    vi.mocked(useNumberFormat).mockReturnValueOnce((value) => formatNumber(value, "en-US"));
    const html = renderToStaticMarkup(<NetWorthEvolutionChartCard data={evolution} selectedCurrency="USD" />);
    expect(html).toContain("$ 126.540,00");
  });

  it("uses a distinct gradient for each chart instance", () => {
    renderToStaticMarkup(<><NetWorthEvolutionChartCard data={evolution} selectedCurrency="USD" /><NetWorthEvolutionChartCard data={evolution} selectedCurrency="USD" /></>);
    const ids = vi.mocked(ResponsiveContainer).mock.calls.map(([props]) =>
      nodes(props.children).find((node) => node.type === "linearGradient")?.props.id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("does not mistake a negative or zero latest net worth for missing data", () => {
    for (const netWorth of [-1500.125, 0]) {
      const html = renderToStaticMarkup(<NetWorthEvolutionChartCard data={[{ ...evolution[0], netWorth }]} selectedCurrency="USD" />);
      expect(html).toContain(netWorth < 0 ? `-$ ${formatNumber(Math.abs(netWorth))}` : `$ ${formatNumber(netWorth)}`);
      expect(html).toContain("recharts-responsive-container");
      expect(html).not.toContain("Sin datos de patrimonio");
    }
  });

  it("shows the latest value rather than the peak when net worth declines", () => {
    const declining = [{ ...evolution[0], netWorth: 120000 }, { ...evolution[1], netWorth: -2500.5 }];
    const html = renderToStaticMarkup(<NetWorthEvolutionChartCard data={declining} selectedCurrency="USD" />);
    expect(html).toMatch(/title="Último patrimonio neto">.*>-\$ 2\.500,50<\/span>/);
    expect(propsOf(chartContainer().children, AreaChart).data).toEqual(declining);
  });

  it("shows an honest empty state instead of a sample series or invented latest value", () => {
    const html = renderToStaticMarkup(<NetWorthEvolutionChartCard data={[]} selectedCurrency="USD" />);
    expect(html).toContain("Sin datos de patrimonio en este período");
    expect(html).toContain("—");
    expect(html).not.toContain("$ 0,00");
    expect(html).not.toContain("recharts-responsive-container");
  });
});

describe("PeriodSummaryMetricsCard", () => {
  it("renders all four supplied ratios, shared badges and target explanations", () => {
    const html = renderToStaticMarkup(<PeriodSummaryMetricsCard summary={summary} />);
    for (const text of ["Resumen del período", "Ratio de ahorro", "Crecimiento del patrimonio", "Ratio de endeudamiento", "Cumplimiento del presupuesto", "27,80%", "+8,40%", "20,00%", "92,40%", "(Recomendado: &gt;= 20%)", "vs. período anterior", "(Saludable: &lt; 30%)", "del gasto planificado"]) {
      expect(html).toContain(text);
    }
    expect(html.match(/data-slot="badge"/g)).toHaveLength(4);
  });

  it("preserves negative ratios and budget overruns without clamping or positive signs", () => {
    const tree = PeriodSummaryMetricsCard({ summary: { savingsRatio: -12.55, netWorthGrowthPct: -8.45, debtRatio: 65, budgetCompliance: 124.55 } });
    const html = renderToStaticMarkup(tree);
    for (const text of ["-12,60%", "-8,50%", "65,00%", "124,60%"]) expect(html).toContain(text);
    expect(nodes(tree).filter((node) => node.type === Badge).map((node) => node.props.variant)).toEqual(["expense", "expense", "expense", "expense"]);
  });

  it("uses the stated savings, debt and budget thresholds", () => {
    const tree = PeriodSummaryMetricsCard({ summary: { savingsRatio: 20, netWorthGrowthPct: 0, debtRatio: 30, budgetCompliance: 100 } });
    expect(nodes(tree).filter((node) => node.type === Badge).map((node) => node.props.variant)).toEqual(["success", "secondary", "expense", "success"]);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("+0,00%");
  });

  it("does not display unavailable ratios as percentages or assign them a health assessment", () => {
    const tree = PeriodSummaryMetricsCard({ summary: { savingsRatio: NaN, netWorthGrowthPct: Infinity, debtRatio: -Infinity, budgetCompliance: NaN } });
    const html = renderToStaticMarkup(tree);
    expect(html.match(/>—<\/span>/g)).toHaveLength(4);
    expect(html).not.toMatch(/NaN|Infinity/);
    expect(nodes(tree).filter((node) => node.type === Badge).every((node) => node.props.variant === "outline")).toBe(true);
  });

  it("distinguishes supplied zero values from missing summary data", () => {
    const zero = renderToStaticMarkup(<PeriodSummaryMetricsCard summary={{ savingsRatio: 0, netWorthGrowthPct: 0, debtRatio: 0, budgetCompliance: 0 }} />);
    expect(zero.match(/>0,00%<\/span>/g)).toHaveLength(3);
    expect(zero.match(/>\+0,00%<\/span>/g)).toHaveLength(1);
    const missing = renderToStaticMarkup(<PeriodSummaryMetricsCard />);
    expect(missing.match(/>—<\/span>/g)).toHaveLength(4);
    expect(missing).not.toContain("0,00%");
  });
});

describe("PopularReportsCard", () => {
  it("renders the four report choices with descriptions, shared buttons and hover styles", () => {
    const html = renderToStaticMarkup(<PopularReportsCard onSelectReport={vi.fn()} />);
    for (const text of ["Reportes populares", "Resumen mensual", "Ingresos, gastos y balance", "Flujo de efectivo", "Entradas y salidas por período", "Rendimiento de inversiones", "Ganancias, pérdidas y rentabilidad", "Evolución del patrimonio", "Activos, pasivos y patrimonio neto"]) expect(html).toContain(text);
    expect(html.match(/data-slot="button"/g)).toHaveLength(4);
    expect(html).toContain("hover:");
    expect(html.match(/lucide-chevron-right/g)).toHaveLength(4);
    expect(html).toContain("lucide-star");
  });

  it("emits the corresponding stable report id from each action", () => {
    const onSelectReport = vi.fn();
    const tree = PopularReportsCard({ onSelectReport });
    const buttons = nodes(tree).filter((node) => node.type === Button);
    expect(buttons).toHaveLength(4);
    buttons.forEach((button) => (button.props.onClick as () => void)());
    expect(onSelectReport.mock.calls).toEqual([["monthly-summary"], ["cash-flow"], ["investment-performance"], ["net-worth"]]);
  });

  it("disables unavailable actions when no selection handler is provided", () => {
    const buttons = nodes(PopularReportsCard({})).filter((node) => node.type === Button);
    expect(buttons.every((button) => button.props.disabled === true)).toBe(true);
  });
});

describe("PeriodConclusionBanner", () => {
  it("renders the analytics narrative verbatim with the conclusion heading and amber lightbulb", () => {
    const html = renderToStaticMarkup(<PeriodConclusionBanner conclusion={conclusion} onViewRecommendations={vi.fn()} />);
    expect(html).toContain("Conclusión del período");
    expect(html).toContain(conclusion.narrative);
    expect(html).toContain("Ver recomendaciones");
    expect(html).toContain("lucide-lightbulb");
    expect(html).toContain("amber");
    expect(html).toContain('data-slot="button"');
    expect(html).not.toContain("27,80%");
  });

  it("forwards the recommendations action and disables it when unavailable", () => {
    const onViewRecommendations = vi.fn();
    const tree = PeriodConclusionBanner({ conclusion, onViewRecommendations });
    (propsOf(tree, Button).onClick as () => void)();
    expect(onViewRecommendations).toHaveBeenCalledOnce();
    expect(propsOf(PeriodConclusionBanner({ conclusion }), Button).disabled).toBe(true);
  });

  it("falls back honestly for absent or blank narratives and escapes dynamic content", () => {
    for (const value of [undefined, { ...conclusion, narrative: "  " }]) {
      const html = renderToStaticMarkup(<PeriodConclusionBanner conclusion={value} />);
      expect(html).toContain("No hay datos suficientes para generar una conclusión del período.");
      expect(html).not.toContain("Tu salud financiera es buena");
    }
    const html = renderToStaticMarkup(<PeriodConclusionBanner conclusion={{ ...conclusion, narrative: "Revisa <script> y gastos & ahorro" }} />);
    expect(html).toContain("Revisa &lt;script&gt; y gastos &amp; ahorro");
    expect(html).not.toContain("<script>");
  });
});
