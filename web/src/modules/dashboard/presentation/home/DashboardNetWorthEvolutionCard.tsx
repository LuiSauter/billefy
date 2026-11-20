"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis } from "recharts";
import { ChevronDown } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  DashboardCard,
  dashboardCardContentClassName,
  dashboardCardHeaderClassName,
  dashboardCardTitleClassName,
} from "./dashboard-card";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart";
import type { NetWorthEvolutionPoint } from "../../domain/dashboard-home-analytics";
import {
  CHART_AXIS_PROPS,
  createAmountTooltipFormatter,
  formatCompactAmount,
  NET_WORTH_RANGE_OPTIONS,
  sliceNetWorthRange,
  type NetWorthRange,
} from "./dashboard-chart-utils";

const NET_WORTH_CHART_CONFIG = {
  value: { label: "Patrimonio neto", color: "var(--color-chart-4)" },
} satisfies ChartConfig;

const NET_WORTH_CHART_MARGIN = { top: 15, right: 10, left: -15, bottom: 0 };
const NET_WORTH_Y_DOMAIN: ["auto", "auto"] = ["auto", "auto"];
const NET_WORTH_INITIAL_DIMENSION = { width: 280, height: 170 };
const NET_WORTH_DOT = { r: 4, fill: "var(--color-value)", stroke: "var(--color-card)", strokeWidth: 2 };
const NET_WORTH_ACTIVE_DOT = { r: 6, fill: "var(--color-value)", stroke: "var(--color-card)", strokeWidth: 2 };

interface DashboardNetWorthEvolutionCardProps {
  data: NetWorthEvolutionPoint[];
  selectedCurrency: string;
}

export function DashboardNetWorthEvolutionCard({
  data,
  selectedCurrency,
}: DashboardNetWorthEvolutionCardProps) {
  const numberPreferences = useNumberPreferences();
  const gradientId = `netWorthGradient-${React.useId().replace(/:/g, "")}`;
  const [range, setRange] = React.useState<NetWorthRange>("6m");

  const activeRange =
    NET_WORTH_RANGE_OPTIONS.find((opt) => opt.id === range) ?? NET_WORTH_RANGE_OPTIONS[0];
  const chartData = React.useMemo(() => sliceNetWorthRange(data, range), [data, range]);

  const formatK = React.useMemo(
    () => (val: number) => formatCompactAmount(val, selectedCurrency, numberPreferences),
    [selectedCurrency, numberPreferences]
  );
  const tooltipFormatter = React.useMemo(
    () => createAmountTooltipFormatter(selectedCurrency, numberPreferences),
    [selectedCurrency, numberPreferences]
  );

  return (
    <DashboardCard className="overflow-hidden h-full flex flex-col justify-between">
      <CardHeader className={`${dashboardCardHeaderClassName} flex flex-row items-center justify-between space-y-0`}>
        <CardTitle className={dashboardCardTitleClassName}>
          Evolución del patrimonio neto
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1 border-border bg-background hover:bg-muted text-foreground"
              >
                <span>{activeRange.label}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="text-xs">
            {NET_WORTH_RANGE_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.id}
                onClick={() => setRange(opt.id)}
                className={opt.id === range ? "font-semibold text-purple-400" : undefined}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className={dashboardCardContentClassName}>
        <ChartContainer
          config={NET_WORTH_CHART_CONFIG}
          initialDimension={NET_WORTH_INITIAL_DIMENSION}
          className="aspect-auto h-[170px] w-full min-w-0"
        >
          <AreaChart data={chartData} margin={NET_WORTH_CHART_MARGIN}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" {...CHART_AXIS_PROPS} />
            <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatK} domain={NET_WORTH_Y_DOMAIN} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={tooltipFormatter}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={NET_WORTH_DOT}
              activeDot={NET_WORTH_ACTIVE_DOT}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </DashboardCard>
  );
}
