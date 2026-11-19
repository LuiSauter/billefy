"use client";

import React, { useState, useMemo } from "react";
import Decimal from "decimal.js";
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis } from "recharts";
import { ChevronDown } from "lucide-react";
import {
  AccountsOverviewMetrics,
  calculateBalanceEvolution,
} from "../domain/accounts-overview";
import { ACCOUNT_CATEGORY_COLORS } from "../domain/account-category-colors";
import { AccountDto, TransactionDto } from "../domain/ledger.types";
import { AccountsCard } from "./AccountsCard";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";
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

interface AccountsAnalyticsSidePanelsProps {
  metrics: AccountsOverviewMetrics;
  accounts: AccountDto[];
  transactions?: TransactionDto[];
  p2pRate?: number;
  currency?: "USD" | "BOB";
}

/** Slice colors come from the single ACCOUNT_CATEGORY_COLORS map (shared with the stat cards). */
const DONUT_CHART_CONFIG: ChartConfig = Object.fromEntries(
  Object.entries(ACCOUNT_CATEGORY_COLORS).map(([group, { chartColor }]) => [
    group,
    { color: chartColor },
  ])
);
const DONUT_INITIAL_DIMENSION = { width: 176, height: 176 };

const EVOLUTION_CHART_CONFIG = {
  balance: { label: "Saldo", color: "var(--color-chart-4)" },
} satisfies ChartConfig;
const EVOLUTION_CHART_MARGIN = { top: 10, right: 10, left: -15, bottom: 0 };
const EVOLUTION_INITIAL_DIMENSION = { width: 280, height: 176 };
const EVOLUTION_Y_DOMAIN: ["auto", "auto"] = ["auto", "auto"];
const EVOLUTION_ACTIVE_DOT = {
  r: 6,
  fill: "var(--color-balance)",
  stroke: "var(--color-card)",
  strokeWidth: 2,
};

const TIMEFRAME_OPTIONS = [3, 6, 12] as const;

export function AccountsAnalyticsSidePanels({
  metrics,
  accounts,
  transactions = [],
  p2pRate = 9.85,
  currency = "USD",
}: AccountsAnalyticsSidePanelsProps) {
  const preferences = useNumberPreferences();
  const [timeframeMonths, setTimeframeMonths] = useState<number>(6);
  const gradientId = `accountsBalanceGradient-${React.useId().replace(/:/g, "")}`;

  const isUsd = currency === "USD";
  const displayTotal = isUsd ? metrics.totalUsd : metrics.totalBob;
  const displayCurrency = isUsd ? "USD" : "BOB";

  // Donut data
  const donutData = useMemo(() => {
    return metrics.categoryList
      .filter((cat) => (isUsd ? (cat.amountUsd ?? cat.amount) : (cat.amountBob ?? cat.amount)) > 0)
      .map((cat) => ({
        name: cat.label,
        group: cat.group,
        value: isUsd ? (cat.amountUsd ?? cat.amount) : (cat.amountBob ?? cat.amount),
        percentage: cat.percentage,
      }));
  }, [metrics.categoryList, isUsd]);

  // Evolution data. The domain series is USD-denominated: convert it so that the pill, the
  // axis and the tooltip all speak the same (selected display) currency.
  const evolutionData = useMemo(() => {
    const usdSeries = calculateBalanceEvolution(accounts, transactions, p2pRate, timeframeMonths);
    if (isUsd) return usdSeries;
    const rate = new Decimal(p2pRate > 0 ? p2pRate : 9.85);
    return usdSeries.map((point) => ({
      ...point,
      balance: new Decimal(point.balance).times(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    }));
  }, [accounts, transactions, p2pRate, timeframeMonths, isUsd]);

  const latestPoint = evolutionData[evolutionData.length - 1];

  const formatK = useMemo(
    () => (value: number) => formatCompactAmount(value, displayCurrency, preferences),
    [displayCurrency, preferences]
  );
  const tooltipFormatter = useMemo(
    () => createAmountTooltipFormatter(displayCurrency, preferences),
    [displayCurrency, preferences]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Panel 1: Distribución del saldo */}
      <AccountsCard className="@container">
        <CardHeader className={appCardHeaderClassName}>
          <CardTitle className={appCardTitleClassName}>Distribución del saldo</CardTitle>
        </CardHeader>

        <CardContent className={appCardContentClassName}>
          {/* Donut + legend side by side only when the card itself is wide enough. */}
          <div className="flex flex-col @lg:flex-row items-center gap-6">
            {/* Donut Container with Center Text */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center min-w-0 min-h-0">
              {donutData.length > 0 ? (
                <ChartContainer
                  config={DONUT_CHART_CONFIG}
                  initialDimension={DONUT_INITIAL_DIMENSION}
                  className="aspect-auto size-44 min-w-0"
                >
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      strokeWidth={0}
                      isAnimationActive={false}
                    >
                      {donutData.map((entry) => (
                        <Cell key={`cell-${entry.group}`} fill={`var(--color-${entry.group})`} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="w-36 h-36 rounded-full border-4 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground text-center p-2">
                  Sin saldos
                </div>
              )}

              {/* Centered Total inside Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                <Amount value={displayTotal} currency={displayCurrency} size="sm" className="min-w-0 truncate" />
                <span className="text-xs font-semibold text-muted-foreground mt-0.5">
                  Total en cuentas
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 flex flex-col gap-2.5 w-full">
              {metrics.categoryList.map((cat) => (
                <div
                  key={cat.group}
                  className="flex items-center justify-between text-xs font-medium"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: ACCOUNT_CATEGORY_COLORS[cat.group].chartColor }}
                    />
                    <span className="text-muted-foreground font-semibold truncate">
                      {cat.label}
                    </span>
                  </div>
                  <span className="text-foreground font-bold">
                    {formatPercent(cat.percentage, preferences)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </AccountsCard>

      {/* Panel 2: Evolución del saldo en cuentas */}
      <AccountsCard>
        <CardHeader className={`${appCardHeaderClassName} flex flex-row items-center justify-between gap-2 space-y-0`}>
          <CardTitle className={appCardTitleClassName}>
            Evolución del saldo en cuentas
          </CardTitle>

          {/* Timeframe selector */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1 border-border bg-background hover:bg-muted text-foreground"
                >
                  <span>Últimos {timeframeMonths} meses</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="text-xs">
              {TIMEFRAME_OPTIONS.map((months) => (
                <DropdownMenuItem
                  key={months}
                  onClick={() => setTimeframeMonths(months)}
                  className={months === timeframeMonths ? "font-semibold text-primary" : undefined}
                >
                  Últimos {months} meses
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className={`${appCardContentClassName} flex flex-col gap-4`}>
          {/* Highlight pill of current total */}
          {latestPoint && (
            <div className="flex justify-end">
              <Amount value={latestPoint.balance} currency={displayCurrency} size="xs" className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 shadow-xs" />
            </div>
          )}

          {/* Area Chart */}
          <ChartContainer
            config={EVOLUTION_CHART_CONFIG}
            initialDimension={EVOLUTION_INITIAL_DIMENSION}
            className="aspect-auto h-44 w-full min-w-0"
          >
            <AreaChart data={evolutionData} margin={EVOLUTION_CHART_MARGIN}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" {...CHART_AXIS_PROPS} />
              <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatK} domain={EVOLUTION_Y_DOMAIN} />
              <ChartTooltip content={<ChartTooltipContent formatter={tooltipFormatter} />} />
              <Area
                type="monotone"
                dataKey="balance"
                name="Saldo"
                stroke="var(--color-balance)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                activeDot={EVOLUTION_ACTIVE_DOT}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </AccountsCard>
    </div>
  );
}
