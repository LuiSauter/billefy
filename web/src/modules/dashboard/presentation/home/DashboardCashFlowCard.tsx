"use client";

import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  DashboardCard,
  dashboardCardContentClassName,
  dashboardCardHeaderClassName,
  dashboardCardTitleClassName,
} from "./dashboard-card";
import { Amount } from "@/shared/ui/amount";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart";
import type { MonthlyCashFlow } from "../../domain/dashboard-home-analytics";
import {
  CHART_AXIS_PROPS,
  createAmountTooltipFormatter,
  formatCompactAmount,
} from "./dashboard-chart-utils";

const CASH_FLOW_CHART_CONFIG = {
  income: { label: "Ingresos", color: "var(--color-chart-2)" },
  expenses: { label: "Gastos", color: "var(--color-chart-5)" },
  savings: { label: "Ahorro", color: "var(--color-chart-4)" },
} satisfies ChartConfig;

const CASH_FLOW_CHART_MARGIN = { top: 10, right: 5, left: -20, bottom: 0 };
const CASH_FLOW_BAR_RADIUS: [number, number, number, number] = [6, 6, 0, 0];
const CASH_FLOW_INITIAL_DIMENSION = { width: 180, height: 135 };

interface DashboardCashFlowCardProps {
  cashFlow: MonthlyCashFlow;
  selectedCurrency: string;
}

export function DashboardCashFlowCard({
  cashFlow,
  selectedCurrency,
}: DashboardCashFlowCardProps) {
  const numberPreferences = useNumberPreferences();

  const { income, expenses, savings } = cashFlow;
  const chartData = useMemo(
    () => [
      { name: CASH_FLOW_CHART_CONFIG.income.label, amount: income, fill: "var(--color-income)" },
      { name: CASH_FLOW_CHART_CONFIG.expenses.label, amount: expenses, fill: "var(--color-expenses)" },
      { name: CASH_FLOW_CHART_CONFIG.savings.label, amount: savings, fill: "var(--color-savings)" },
    ],
    [income, expenses, savings]
  );

  const formatK = useMemo(
    () => (val: number) => formatCompactAmount(val, selectedCurrency, numberPreferences),
    [selectedCurrency, numberPreferences]
  );
  const tooltipFormatter = useMemo(
    () => createAmountTooltipFormatter(selectedCurrency, numberPreferences),
    [selectedCurrency, numberPreferences]
  );

  return (
    <DashboardCard className="@container overflow-hidden h-full">
      <CardHeader className={dashboardCardHeaderClassName}>
        <CardTitle className={dashboardCardTitleClassName}>
          Flujo del mes
        </CardTitle>
      </CardHeader>

      <CardContent className={`${dashboardCardContentClassName} grid grid-cols-1 @lg:grid-cols-[1.1fr_1.3fr] gap-4 items-center`}>
        {/* Left Side: Legend with Values */}
        <div className="flex flex-col gap-3">
          {/* Ingresos */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-chart-2 shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground truncate">
                Ingresos
              </span>
            </div>
            <Amount value={cashFlow.income} currency={selectedCurrency} size="sm" className="shrink-0" />
          </div>

          {/* Gastos */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-chart-5 shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground truncate">
                Gastos
              </span>
            </div>
            <Amount value={cashFlow.expenses} currency={selectedCurrency} size="sm" className="shrink-0" />
          </div>

          {/* Ahorro / Inversión */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-chart-4 shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground truncate">
                Ahorro / Inversión
              </span>
            </div>
            <Amount value={cashFlow.savings} currency={selectedCurrency} size="sm" className="shrink-0" />
          </div>
        </div>

        {/* Right Side: Vertical Bar Chart */}
        <ChartContainer
          config={CASH_FLOW_CHART_CONFIG}
          initialDimension={CASH_FLOW_INITIAL_DIMENSION}
          className="order-first @md:order-none aspect-auto h-[135px] w-full min-w-0"
        >
          <BarChart data={chartData} margin={CASH_FLOW_CHART_MARGIN}>
            <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatK} />
            <XAxis dataKey="name" hide />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={tooltipFormatter}
                />
              }
            />
            <Bar dataKey="amount" radius={CASH_FLOW_BAR_RADIUS} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </DashboardCard>
  );
}
