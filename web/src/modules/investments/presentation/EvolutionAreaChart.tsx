"use client";

import React, { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import {
  CHART_AXIS_PROPS,
  createAmountTooltipFormatter,
  formatCompactAmount,
} from "@/shared/lib/chart-utils";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { Amount } from "@/shared/ui/amount";
import { Badge } from "@/shared/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart";
import { InvestmentsCard } from "./InvestmentsCard";

export interface EvolutionChartPoint {
  month: string;
  value: number;
}

/** purple = whole portfolio, emerald = a single asset. */
export type EvolutionChartVariant = "purple" | "emerald";

interface EvolutionAreaChartProps {
  title: string;
  points: EvolutionChartPoint[];
  currentValue: number;
  currency?: string;
  variant?: EvolutionChartVariant;
  /** Extra header controls (e.g. a period selector). */
  actions?: React.ReactNode;
}

const CHART_CONFIGS = {
  purple: { value: { label: "Valor", color: "var(--color-chart-4)" } },
  emerald: { value: { label: "Valor", color: "var(--color-chart-2)" } },
} satisfies Record<EvolutionChartVariant, ChartConfig>;

const BADGE_VARIANT = { purple: "purple", emerald: "success" } as const;

const CHART_MARGIN = { top: 12, right: 12, left: -16, bottom: 0 };
const CHART_INITIAL_DIMENSION = { width: 320, height: 224 };
const ACTIVE_DOT = { r: 5, fill: "var(--color-value)", stroke: "var(--color-card)", strokeWidth: 2 };

/** Single area chart behind both the portfolio and the per-asset evolution cards. */
export function EvolutionAreaChart({
  title,
  points,
  currentValue,
  currency = "USD",
  variant = "purple",
  actions,
}: EvolutionAreaChartProps) {
  const preferences = useNumberPreferences();
  const gradientId = `evolutionGradient-${useId().replace(/:/g, "")}`;

  const formatYAxis = useMemo(
    () => (value: number) => formatCompactAmount(value, currency, preferences),
    [currency, preferences]
  );
  const tooltipFormatter = useMemo(
    () => createAmountTooltipFormatter(currency, preferences),
    [currency, preferences]
  );

  return (
    <InvestmentsCard className="min-w-0 h-full flex flex-col justify-between">
      <CardHeader className={`${appCardHeaderClassName} flex flex-row flex-wrap items-center justify-between gap-2 space-y-0`}>
        <CardTitle className={appCardTitleClassName}>{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={BADGE_VARIANT[variant]} className="rounded-lg font-bold">
            <Amount value={currentValue} currency={currency} size="inherit" tone="inherit" />
          </Badge>
          {actions}
        </div>
      </CardHeader>

      <CardContent className={appCardContentClassName}>
        <ChartContainer
          config={CHART_CONFIGS[variant]}
          initialDimension={CHART_INITIAL_DIMENSION}
          className="aspect-auto h-56 w-full min-w-0"
        >
          <AreaChart data={points} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.45} />
                <stop offset="85%" stopColor="var(--color-value)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.35} />
            <XAxis dataKey="month" {...CHART_AXIS_PROPS} dy={6} />
            <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatYAxis} />
            <ChartTooltip content={<ChartTooltipContent formatter={tooltipFormatter} />} />
            <Area
              type="monotone"
              dataKey="value"
              name="Valor"
              stroke="var(--color-value)"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              activeDot={ACTIVE_DOT}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </InvestmentsCard>
  );
}
