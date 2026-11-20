"use client";

import React, { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { Sparkles } from "lucide-react";
import { AssetCategorySummary } from "../domain/patrimonio.types";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";
import { createAmountTooltipFormatter } from "@/shared/lib/chart-utils";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { Amount, Percentage } from "@/shared/ui/amount";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart";
import { PatrimonioCard } from "./PatrimonioCard";
import { PATRIMONIO_CATEGORY_ICONS } from "./category-icons";

interface PatrimonioDistributionDonutProps {
  categories: AssetCategorySummary[];
  totalAssets: number;
  currency?: string;
}

const DONUT_CONFIG = {} satisfies ChartConfig;
const DONUT_INITIAL_DIMENSION = { width: 176, height: 176 };

export function PatrimonioDistributionDonut({
  categories,
  totalAssets,
  currency = "USD",
}: PatrimonioDistributionDonutProps) {
  const preferences = useNumberPreferences();
  const isEmpty = categories.length === 0;

  const chartData = useMemo(
    () => categories.map((c) => ({ name: c.label, value: c.totalValue, fill: c.color, percentage: c.percentage })),
    [categories]
  );
  const tooltipFormatter = useMemo(
    () => createAmountTooltipFormatter(currency, preferences, (payload) => formatPercent(Number(payload.percentage ?? 0), preferences)),
    [currency, preferences]
  );

  return (
    <PatrimonioCard className="@container min-w-0 h-full flex flex-col justify-between">
      <CardHeader className={appCardHeaderClassName}>
        <CardTitle className={appCardTitleClassName}>Distribución del patrimonio (activos)</CardTitle>
      </CardHeader>

      <CardContent className={`${appCardContentClassName} flex flex-col @md:flex-row items-center gap-6 my-auto w-full`}>
        {/* Donut Container */}
        <div className="relative size-44 shrink-0 flex items-center justify-center">
          {isEmpty ? (
            // No chart at all: nothing to hover, so no tooltip can claim an amount that does not exist.
            <div className="size-[148px] rounded-full border-[24px] border-muted" aria-hidden="true" />
          ) : (
            <ChartContainer config={DONUT_CONFIG} initialDimension={DONUT_INITIAL_DIMENSION} className="aspect-auto size-44 min-w-0">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel formatter={tooltipFormatter} />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={74}
                  paddingAngle={3}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}

          {/* Centered Total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span className="text-sm font-black text-foreground tracking-tight leading-tight max-w-[7.5rem] truncate">
              <Amount value={totalAssets} currency={currency} size="inherit" tone="inherit" />
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">Activos totales</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 flex flex-col gap-2.5 w-full min-w-0">
          {categories.map((item) => {
            const Icon = PATRIMONIO_CATEGORY_ICONS[item.icon] || Sparkles;
            return (
              <div key={item.category} className="flex items-center justify-between gap-2 text-xs font-medium">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-md text-white shrink-0" style={{ backgroundColor: item.color }}>
                    <Icon className="w-3 h-3" aria-hidden="true" />
                  </div>
                  <span className="text-muted-foreground font-semibold truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-foreground font-bold">
                    <Percentage value={item.percentage} sign="never" size="inherit" tone="inherit" />
                  </span>
                  <span className="text-[11px] text-muted-foreground hidden @xs:inline">
                    <Amount value={item.totalValue} currency={currency} size="inherit" tone="inherit" />
                  </span>
                </div>
              </div>
            );
          })}

          {isEmpty && <span className="text-xs text-muted-foreground italic">Sin datos de activos</span>}
        </div>
      </CardContent>
    </PatrimonioCard>
  );
}
