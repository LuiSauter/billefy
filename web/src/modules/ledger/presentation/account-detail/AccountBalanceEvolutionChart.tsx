"use client";

import React, { useState, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AccountDto, TransactionDto } from "../../domain/ledger.types";
import { calculateBalanceEvolutionPoints } from "../../domain/account-detail";
import { AccountsCard } from "../AccountsCard";
import { accountsCompactSelectClassName } from "../accounts-styles";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatAmountText } from "@/shared/lib/amount-format";
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
import { Badge } from "@/shared/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart";
import { SelectField, type SelectFieldOption } from "@/shared/ui/select-field";

interface AccountBalanceEvolutionChartProps {
  account: AccountDto;
  transactions: TransactionDto[];
}

type EvolutionRange = "1m" | "3m" | "6m" | "1y";

const RANGE_OPTIONS: SelectFieldOption[] = [
  { value: "1m", label: "Últimos 30 días" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "1y", label: "Este año" },
];

const BALANCE_CHART_CONFIG = {
  balance: { label: "Saldo", color: "var(--color-chart-4)" },
} satisfies ChartConfig;
const BALANCE_CHART_MARGIN = { top: 20, right: 10, left: -15, bottom: 0 };
const BALANCE_INITIAL_DIMENSION = { width: 320, height: 220 };
const BALANCE_Y_DOMAIN: ["auto", "auto"] = ["auto", "auto"];
const BALANCE_DOT = {
  r: 3.5,
  fill: "var(--color-card)",
  stroke: "var(--color-balance)",
  strokeWidth: 2,
};
const BALANCE_ACTIVE_DOT = {
  r: 5,
  fill: "var(--color-balance)",
  stroke: "var(--color-card)",
  strokeWidth: 2,
};

export function AccountBalanceEvolutionChart({
  account,
  transactions,
}: AccountBalanceEvolutionChartProps) {
  const preferences = useNumberPreferences();
  const [range, setRange] = useState<EvolutionRange>("6m");
  const gradientId = `accountBalanceGradient-${React.useId().replace(/:/g, "")}`;

  const data = useMemo(() => {
    return calculateBalanceEvolutionPoints(account, transactions, range);
  }, [account, transactions, range]);

  const latestPoint = data[data.length - 1];

  const formatYAxis = useMemo(
    () => (value: number) => formatCompactAmount(value, account.currency, preferences),
    [account.currency, preferences]
  );
  const tooltipFormatter = useMemo(
    () => createAmountTooltipFormatter(account.currency, preferences),
    [account.currency, preferences]
  );

  return (
    <AccountsCard className="min-w-0">
      {/* Header */}
      <CardHeader className={`${appCardHeaderClassName} flex flex-row items-center justify-between gap-2 space-y-0`}>
        <CardTitle className={appCardTitleClassName}>Evolución del saldo</CardTitle>

        {/* Range selector */}
        <SelectField
          aria-label="Rango de tiempo"
          value={range}
          onChange={(e) => setRange(e.target.value as EvolutionRange)}
          options={RANGE_OPTIONS}
          wrapperClassName="w-auto"
          className={accountsCompactSelectClassName}
        />
      </CardHeader>

      {/* Chart Canvas */}
      <CardContent className={`${appCardContentClassName} relative`}>
        {/* Floating Callout for Current Balance */}
        {latestPoint && (
          <Badge
            variant="purple"
            className="absolute top-4 right-8 z-10 rounded-lg border-purple-500/40 font-bold backdrop-blur-xs pointer-events-none"
          >
            {formatAmountText(latestPoint.balance, account.currency, preferences)}
          </Badge>
        )}

        <ChartContainer
          config={BALANCE_CHART_CONFIG}
          initialDimension={BALANCE_INITIAL_DIMENSION}
          className="aspect-auto h-[220px] w-full min-w-0"
        >
          <AreaChart data={data} margin={BALANCE_CHART_MARGIN}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.45} />
                <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
              opacity={0.35}
            />

            <XAxis dataKey="label" {...CHART_AXIS_PROPS} dy={6} />

            <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatYAxis} domain={BALANCE_Y_DOMAIN} />

            <ChartTooltip content={<ChartTooltipContent formatter={tooltipFormatter} />} />

            <Area
              type="monotone"
              dataKey="balance"
              name="Saldo"
              stroke="var(--color-balance)"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={BALANCE_DOT}
              activeDot={BALANCE_ACTIVE_DOT}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </AccountsCard>
  );
}
