"use client";

import React, { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { CHART_AXIS_PROPS, createAmountTooltipFormatter, formatCompactAmount } from "@/shared/lib/chart-utils";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/ui/chart";
import type { FinancialReport } from "../domain/reports-analytics";
import { Amount } from "@/shared/ui/amount";
import { REPORT_CHART_INITIAL_DIMENSION, REPORT_SERIES_COLORS, useReportMoney } from "./reports-shared";

interface NetWorthEvolutionChartCardProps {
  /** Chronological values already converted to selectedCurrency by the domain engine. */
  data: FinancialReport["netWorthEvolution"];
  selectedCurrency: string;
}

const CHART_CONFIG = {
  netWorth: { label: "Patrimonio neto", color: REPORT_SERIES_COLORS.netWorth },
} satisfies ChartConfig;
const CHART_MARGIN = { top: 12, right: 12, left: 0, bottom: 0 };
const DOT = { r: 3, fill: "var(--background)", strokeWidth: 2 };
const ACTIVE_DOT = { r: 5 };
const monthKeyLabel = (_: unknown, payload: readonly { payload?: { monthKey?: string } }[]) => payload[0]?.payload?.monthKey ?? "";

export const NetWorthEvolutionChartCard = React.memo(function NetWorthEvolutionChartCard({ data, selectedCurrency }: NetWorthEvolutionChartCardProps) {
  const gradientId = `net-worth-${useId().replace(/:/g, "")}`;
  const preferences = useNumberPreferences();
  const money = useReportMoney(selectedCurrency);
  const formatYAxis = useMemo(
    () => (value: number) => formatCompactAmount(value, selectedCurrency, preferences),
    [selectedCurrency, preferences],
  );
  const tooltipFormatter = useMemo(
    () => createAmountTooltipFormatter(selectedCurrency, preferences),
    [selectedCurrency, preferences],
  );
  const latest = data.at(-1);

  return (
    <Card className="h-full min-w-0 border-border/80">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight">Evolución del patrimonio neto</h2>
        <Badge variant="purple" className="tabular-nums" title="Último patrimonio neto">
          {latest ? <Amount value={latest.netWorth} currency={selectedCurrency} size="inherit" tone="inherit" /> : "—"}
        </Badge>
      </CardHeader>
      <CardContent>
        {latest ? (
          <>
            <ChartContainer
              config={CHART_CONFIG}
              initialDimension={REPORT_CHART_INITIAL_DIMENSION}
              className="aspect-auto h-56 w-full min-w-0"
              role="img"
              aria-label={`Evolución del patrimonio neto por mes en ${selectedCurrency}`}
            >
              <AreaChart data={data} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={REPORT_SERIES_COLORS.netWorth} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={REPORT_SERIES_COLORS.netWorth} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" {...CHART_AXIS_PROPS} />
                <YAxis {...CHART_AXIS_PROPS} width={52} tickFormatter={formatYAxis} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={monthKeyLabel} formatter={tooltipFormatter} />} />
                <Area type="monotone" dataKey="netWorth" name="Patrimonio neto" stroke={REPORT_SERIES_COLORS.netWorth} strokeWidth={3} fill={`url(#${gradientId})`} dot={DOT} activeDot={ACTIVE_DOT} isAnimationActive={false} />
              </AreaChart>
            </ChartContainer>
            <table className="sr-only">
              <caption>Patrimonio neto por mes ({selectedCurrency})</caption>
              <thead><tr><th>Mes</th><th>Patrimonio neto</th></tr></thead>
              <tbody>{data.map((point) => <tr key={point.monthKey}><th scope="row">{point.monthKey}</th><td>{money(point.netWorth)}</td></tr>)}</tbody>
            </table>
          </>
        ) : (
          <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">Sin datos de patrimonio en este período</p>
        )}
      </CardContent>
    </Card>
  );
});
