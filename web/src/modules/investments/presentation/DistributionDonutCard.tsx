"use client";

import React, { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";
import { createAmountTooltipFormatter } from "@/shared/lib/chart-utils";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { Percentage } from "@/shared/ui/amount";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart";
import { cn } from "@/shared/lib/utils";
import { InvestmentsCard } from "./InvestmentsCard";

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  /** Share of the total, 0-100. */
  percentage: number;
  color: string;
}

interface DistributionDonutCardProps {
  title: string;
  slices: DonutSlice[];
  /** Big text in the donut hole. */
  centerPrimary: React.ReactNode;
  centerSecondary: string;
  currency?: string;
  /** Legend text when there are no slices. */
  emptyLabel?: string;
  /** Slice rendered emphasised in the legend (e.g. the asset being viewed). */
  highlightId?: string;
}

const DONUT_CONFIG = {} satisfies ChartConfig;
const DONUT_INITIAL_DIMENSION = { width: 176, height: 176 };
const PLACEHOLDER_DATA = [{ name: "Sin datos", value: 1, fill: "var(--muted)", percentage: 0 }];

/** Single donut + legend card behind both the portfolio-by-kind and the asset-share cards. */
export function DistributionDonutCard({
  title,
  slices,
  centerPrimary,
  centerSecondary,
  currency = "USD",
  emptyLabel = "Sin datos de distribución",
  highlightId,
}: DistributionDonutCardProps) {
  const preferences = useNumberPreferences();
  const isEmpty = slices.length === 0;

  const chartData = useMemo(
    () => (isEmpty ? PLACEHOLDER_DATA : slices.map((s) => ({ name: s.label, value: s.value, fill: s.color, percentage: s.percentage }))),
    [slices, isEmpty]
  );
  const tooltipFormatter = useMemo(
    () => createAmountTooltipFormatter(currency, preferences, (payload) => formatPercent(Number(payload.percentage ?? 0), preferences)),
    [currency, preferences]
  );

  return (
    <InvestmentsCard className="@container min-w-0 h-full flex flex-col justify-between">
      <CardHeader className={appCardHeaderClassName}>
        <CardTitle className={appCardTitleClassName}>{title}</CardTitle>
      </CardHeader>

      <CardContent className={`${appCardContentClassName} flex flex-col @md:flex-row items-center gap-6 my-auto w-full`}>
        <div className="relative size-44 shrink-0 flex items-center justify-center">
          <ChartContainer config={DONUT_CONFIG} initialDimension={DONUT_INITIAL_DIMENSION} className="aspect-auto size-44 min-w-0">
            <PieChart>
              {!isEmpty && <ChartTooltip content={<ChartTooltipContent hideLabel formatter={tooltipFormatter} />} />}
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={74}
                paddingAngle={isEmpty ? 0 : 3}
                stroke="none"
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span className="text-sm font-black text-foreground tracking-tight leading-tight max-w-[7.5rem] truncate">
              {centerPrimary}
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">{centerSecondary}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2.5 w-full min-w-0">
          {slices.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between text-xs font-medium",
                highlightId === item.id ? "font-bold text-foreground" : "text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="size-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                <span className="truncate font-semibold">{item.label}</span>
              </div>
              <span className="text-foreground font-bold ml-2">
                <Percentage value={item.percentage} sign="never" size="inherit" tone="inherit" />
              </span>
            </div>
          ))}
          {isEmpty && <span className="text-xs text-muted-foreground italic">{emptyLabel}</span>}
        </div>
      </CardContent>
    </InvestmentsCard>
  );
}
