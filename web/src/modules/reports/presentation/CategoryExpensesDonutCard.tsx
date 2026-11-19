"use client";

import React, { useMemo } from "react";
import { Car, Cross, Ellipsis, Heart, House, Tag, Utensils } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";
import { createAmountTooltipFormatter } from "@/shared/lib/chart-utils";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/ui/chart";
import type { FinancialReport } from "../domain/reports-analytics";
import { Amount, Percentage } from "@/shared/ui/amount";
import { REPORT_PALETTE } from "./reports-shared";

interface CategoryExpensesDonutCardProps {
  data: FinancialReport["categoryExpenses"];
  totalExpenses: number;
  selectedCurrency: string;
}

const DONUT_CONFIG = {} satisfies ChartConfig;
const DONUT_INITIAL_DIMENSION = { width: 192, height: 192 };
const categoryIcons: Record<string, typeof Tag | undefined> = {
  vivienda: House, alimentación: Utensils, transporte: Car,
  "estilo de vida": Heart, salud: Cross, otros: Ellipsis,
};

// The card sits in a `lg:grid-cols-3` slot, so its width depends on the sidebar and
// grid column rather than the viewport. The side-by-side layout (192px donut + ~220px
// legend + 40px padding) needs roughly 480px, hence the @lg (512px) container breakpoint.
export const CategoryExpensesDonutCard = React.memo(function CategoryExpensesDonutCard({ data, totalExpenses, selectedCurrency }: CategoryExpensesDonutCardProps) {
  const preferences = useNumberPreferences();
  const chartData = useMemo(
    () => data.map((item, index) => ({
      name: item.category, amount: item.amount, percentage: item.percentage,
      fill: REPORT_PALETTE[index % REPORT_PALETTE.length],
    })),
    [data],
  );
  const tooltipFormatter = useMemo(
    () => createAmountTooltipFormatter(selectedCurrency, preferences, (payload) => formatPercent(Number(payload.percentage ?? 0), preferences)),
    [selectedCurrency, preferences],
  );

  return (
    <Card className="@container h-full min-w-0 border-border/80">
      <CardHeader><h2 className="text-lg font-bold tracking-tight">Gastos por categoría</h2></CardHeader>
      <CardContent className="flex flex-col items-center gap-4 @lg:flex-row">
        <div className="relative size-48 min-w-0 shrink-0">
          {data.length > 0 && totalExpenses > 0 && (
            <ChartContainer config={DONUT_CONFIG} initialDimension={DONUT_INITIAL_DIMENSION} className="aspect-auto size-48 min-w-0">
              <PieChart aria-label={`Distribución de gastos en ${selectedCurrency}`}>
                <ChartTooltip content={<ChartTooltipContent hideLabel formatter={tooltipFormatter} />} />
                <Pie data={chartData} dataKey="amount" nameKey="name" innerRadius="68%" outerRadius="98%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
                  {chartData.map((item) => <Cell key={item.name} fill={item.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
          <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-full px-8 text-center ${data.length === 0 ? "border-8 border-muted" : ""}`}>
            <span className="max-w-full break-words text-sm font-bold tabular-nums"><Amount value={totalExpenses} currency={selectedCurrency} size="inherit" tone="inherit" /></span>
            <span className="mt-1 text-xs text-muted-foreground">Total de gastos</span>
          </div>
        </div>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin gastos en este período</p>
        ) : (
          <ul className="w-full min-w-0 flex-1 space-y-2.5 text-xs">
            {chartData.map((item) => {
              const Icon = categoryIcons[item.name.toLocaleLowerCase("es")] ?? Tag;
              return (
                <li key={item.name} className="flex items-center gap-2">
                  <Badge variant="outline" aria-hidden="true" className="size-7 rounded-lg p-0 [&>svg]:size-4" style={{ color: item.fill, backgroundColor: `${item.fill}20`, borderColor: `${item.fill}40` }}>
                    <Icon />
                  </Badge>
                  <span className="min-w-0 flex-1 truncate" title={item.name}>{item.name}</span>
                  <span className="shrink-0 tabular-nums"><Percentage value={item.percentage} sign="never" size="inherit" tone="inherit" /></span>
                  <span className="ml-2 shrink-0 text-right font-semibold tabular-nums"><Amount value={item.amount} currency={selectedCurrency} size="inherit" tone="inherit" /></span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
});
