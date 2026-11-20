"use client";

import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { CHART_AXIS_PROPS, createAmountTooltipFormatter, formatCompactAmount } from "@/shared/lib/chart-utils";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/ui/chart";
import type { FinancialReport } from "../domain/reports-analytics";
import { REPORT_CHART_INITIAL_DIMENSION, REPORT_SERIES_COLORS, useReportMoney } from "./reports-shared";

interface IncomeVsExpensesChartCardProps {
  data: FinancialReport["cashFlowEvolution"];
  selectedCurrency: string;
}

const CHART_CONFIG = {
  income: { label: "Ingresos", color: REPORT_SERIES_COLORS.income },
  expenses: { label: "Gastos", color: REPORT_SERIES_COLORS.expenses },
} satisfies ChartConfig;
const CHART_MARGIN = { top: 12, right: 4, left: 0, bottom: 0 };
const TOOLTIP_CURSOR = { fill: "var(--muted)", fillOpacity: 0.3 };
const monthKeyLabel = (_: unknown, payload: readonly { payload?: { monthKey?: string } }[]) => payload[0]?.payload?.monthKey ?? "";

export const IncomeVsExpensesChartCard = React.memo(function IncomeVsExpensesChartCard({ data, selectedCurrency }: IncomeVsExpensesChartCardProps) {
  const preferences = useNumberPreferences();
  const money = useReportMoney(selectedCurrency);
  const hasMovements = useMemo(() => data.some((point) => point.income !== 0 || point.expenses !== 0), [data]);
  const formatYAxis = useMemo(
    () => (value: number) => formatCompactAmount(value, selectedCurrency, preferences),
    [selectedCurrency, preferences],
  );
  const tooltipFormatter = useMemo(
    () => createAmountTooltipFormatter(selectedCurrency, preferences),
    [selectedCurrency, preferences],
  );

  return (
    <Card className="h-full min-w-0 border-border/80">
      <CardHeader><h2 className="text-lg font-bold tracking-tight">Ingresos vs. Gastos</h2></CardHeader>
      <CardContent>
        {hasMovements ? (
          <>
            <ChartContainer
              config={CHART_CONFIG}
              initialDimension={REPORT_CHART_INITIAL_DIMENSION}
              className="aspect-auto h-56 w-full min-w-0"
              role="img"
              aria-label={`Ingresos y gastos por mes en ${selectedCurrency}`}
            >
              <BarChart data={data} margin={CHART_MARGIN} barGap={6}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" {...CHART_AXIS_PROPS} />
                <YAxis {...CHART_AXIS_PROPS} width={52} tickFormatter={formatYAxis} />
                <ChartTooltip
                  cursor={TOOLTIP_CURSOR}
                  content={<ChartTooltipContent labelFormatter={monthKeyLabel} formatter={tooltipFormatter} />}
                />
                <Bar dataKey="income" name="Ingresos" fill={REPORT_SERIES_COLORS.income} radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                <Bar dataKey="expenses" name="Gastos" fill={REPORT_SERIES_COLORS.expenses} radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
            <table className="sr-only">
              <caption>Ingresos y gastos por mes ({selectedCurrency})</caption>
              <thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th></tr></thead>
              <tbody>{data.map((point) => <tr key={point.monthKey}><th scope="row">{point.monthKey}</th><td>{money(point.income)}</td><td>{money(point.expenses)}</td></tr>)}</tbody>
            </table>
          </>
        ) : (
          <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">Sin movimientos en este período</p>
        )}
        <div className="mt-3 flex justify-center gap-6 text-xs" aria-label="Leyenda">
          <span className="flex items-center gap-2"><span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: REPORT_SERIES_COLORS.income }} />Ingresos</span>
          <span className="flex items-center gap-2"><span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: REPORT_SERIES_COLORS.expenses }} />Gastos</span>
        </div>
      </CardContent>
    </Card>
  );
});
