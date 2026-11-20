"use client";

import React, { useMemo, useState } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { Calendar, ChevronDown } from "lucide-react";
import {
  PATRIMONIO_PERIOD_OPTIONS,
  sliceEvolutionPoints,
  type PatrimonioPeriod,
} from "../domain/net-worth-analytics";
import { PatrimonioEvolutionPoint } from "../domain/patrimonio.types";
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
import { Button } from "@/shared/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { PatrimonioCard } from "./PatrimonioCard";

interface PatrimonioEvolutionChartProps {
  points: PatrimonioEvolutionPoint[];
  currentNetWorth: number;
  currency?: string;
}

const CHART_CONFIG = {
  value: { label: "Patrimonio neto", color: "var(--color-chart-4)" },
} satisfies ChartConfig;
const CHART_MARGIN = { top: 12, right: 12, left: -16, bottom: 0 };
const CHART_INITIAL_DIMENSION = { width: 320, height: 224 };
const Y_DOMAIN: ["auto", "auto"] = ["auto", "auto"];
const ACTIVE_DOT = { r: 5, fill: "var(--color-value)", stroke: "var(--color-card)", strokeWidth: 2 };

export function PatrimonioEvolutionChart({
  points,
  currentNetWorth,
  currency = "USD",
}: PatrimonioEvolutionChartProps) {
  const numberPreferences = useNumberPreferences();
  const gradientId = `netWorthAreaGrad-${React.useId().replace(/:/g, "")}`;
  const [period, setPeriod] = useState<PatrimonioPeriod>("12m");

  const activePeriod =
    PATRIMONIO_PERIOD_OPTIONS.find((option) => option.value === period) ?? PATRIMONIO_PERIOD_OPTIONS[1];
  const chartData = useMemo(() => sliceEvolutionPoints(points, period), [points, period]);
  const formatTick = useMemo(
    () => (value: number) => formatCompactAmount(value, currency, numberPreferences),
    [currency, numberPreferences]
  );
  const tooltipFormatter = useMemo(
    () => createAmountTooltipFormatter(currency, numberPreferences),
    [currency, numberPreferences]
  );

  return (
    <PatrimonioCard className="@container flex flex-col justify-between h-full">
      <CardHeader className={`${appCardHeaderClassName} flex flex-row items-center justify-between gap-2 space-y-0`}>
        <CardTitle className={appCardTitleClassName}>Evolución del patrimonio neto</CardTitle>

        <div className="flex items-center gap-2">
          <span className="hidden @md:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-purple-600 text-white shadow-xs">
            <Amount value={currentNetWorth} currency={currency} size="inherit" tone="inherit" />
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Período de la evolución"
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1.5"
                >
                  <Calendar className="text-muted-foreground" aria-hidden="true" />
                  <span>{activePeriod.label}</span>
                  <ChevronDown className="text-muted-foreground" aria-hidden="true" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48 text-xs">
              {PATRIMONIO_PERIOD_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setPeriod(option.value)}
                  className={option.value === period ? "font-semibold text-purple-400" : undefined}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className={appCardContentClassName}>
        <ChartContainer
          config={CHART_CONFIG}
          initialDimension={CHART_INITIAL_DIMENSION}
          className="aspect-auto h-56 w-full min-w-0"
        >
          <AreaChart data={chartData} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.45} />
                <stop offset="85%" stopColor="var(--color-value)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" {...CHART_AXIS_PROPS} />
            <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatTick} domain={Y_DOMAIN} />
            <ChartTooltip content={<ChartTooltipContent formatter={tooltipFormatter} />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              activeDot={ACTIVE_DOT}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </PatrimonioCard>
  );
}
