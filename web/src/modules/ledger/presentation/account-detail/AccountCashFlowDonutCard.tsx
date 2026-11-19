"use client";

import React, { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { AccountDto, TransactionDto } from "../../domain/ledger.types";
import { calculateCashFlowComparison } from "../../domain/account-detail";
import { AccountsCard } from "../AccountsCard";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";
import { createAmountTooltipFormatter } from "@/shared/lib/chart-utils";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { Amount } from "@/shared/ui/amount";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart";

interface AccountCashFlowDonutCardProps {
  account: AccountDto;
  transactions: TransactionDto[];
}

/** Single source for the income / expense series colors (donut slices AND legend dots). */
const COLOR_INCOME = "var(--color-chart-2)"; // emerald
const COLOR_EXPENSE = "var(--color-chart-5)"; // rose

const CASH_FLOW_CHART_CONFIG = {
  income: { label: "Ingresos", color: COLOR_INCOME },
  expense: { label: "Gastos", color: COLOR_EXPENSE },
} satisfies ChartConfig;
const CASH_FLOW_INITIAL_DIMENSION = { width: 180, height: 180 };

export function AccountCashFlowDonutCard({
  account,
  transactions,
}: AccountCashFlowDonutCardProps) {
  const preferences = useNumberPreferences();

  const comparison = useMemo(() => {
    return calculateCashFlowComparison(transactions);
  }, [transactions]);

  const isEmpty = comparison.totalFlow.isZero();

  const chartData = useMemo(() => {
    if (isEmpty) {
      return [
        { name: "Sin movimientos", value: 1, fill: "var(--muted)", isPlaceholder: true },
      ];
    }

    return [
      {
        name: "Ingresos",
        value: comparison.income.toNumber(),
        fill: COLOR_INCOME,
        percentage: comparison.incomePercentage,
      },
      {
        name: "Gastos",
        value: comparison.expenses.toNumber(),
        fill: COLOR_EXPENSE,
        percentage: comparison.expensePercentage,
      },
    ].filter((item) => item.value > 0);
  }, [comparison, isEmpty]);

  const tooltipFormatter = useMemo(
    () =>
      createAmountTooltipFormatter(account.currency, preferences, (payload) =>
        formatPercent(Number(payload.percentage ?? 0), preferences)
      ),
    [account.currency, preferences]
  );

  return (
    <AccountsCard className="@container min-w-0 flex flex-col justify-between">
      {/* Header */}
      <CardHeader className={appCardHeaderClassName}>
        <CardTitle className={appCardTitleClassName}>Entradas vs. Salidas</CardTitle>
      </CardHeader>

      {/* Content: Donut + Legend. Side by side only when the card itself is wide enough. */}
      <CardContent className={`${appCardContentClassName} flex flex-col @lg:flex-row items-center justify-between gap-4 my-auto w-full`}>
        {/* Donut Container with Center Label */}
        <div className="w-[180px] h-[180px] relative shrink-0 flex items-center justify-center">
          {/* Absolute Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span className="truncate max-w-[120px]">
              <Amount value={comparison.totalFlow.toNumber()} currency={account.currency} size="sm" className="min-w-0 truncate" />
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              Total
            </span>
          </div>

          <ChartContainer
            config={CASH_FLOW_CHART_CONFIG}
            initialDimension={CASH_FLOW_INITIAL_DIMENSION}
            className="aspect-auto size-[180px] min-w-0"
          >
            <PieChart>
              {!isEmpty && (
                <ChartTooltip
                  content={<ChartTooltipContent hideLabel formatter={tooltipFormatter} />}
                />
              )}
              <Pie
                data={chartData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={chartData.length > 1 ? 4 : 0}
                stroke="none"
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>

        {/* Legend on the right */}
        <div className="flex flex-col gap-3 min-w-[140px] w-full @lg:w-auto">
          {/* Ingresos Row */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLOR_INCOME }}
              />
              <span className="text-xs text-muted-foreground font-medium">
                Ingresos
              </span>
            </div>
            <div className="pl-4.5">
              <Amount value={comparison.income.toNumber()} currency={account.currency} size="sm" className="min-w-0 truncate" />
              <span className="text-xs text-muted-foreground ml-1">
                ({formatPercent(comparison.incomePercentage, preferences)})
              </span>
            </div>
          </div>

          {/* Gastos Row */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLOR_EXPENSE }}
              />
              <span className="text-xs text-muted-foreground font-medium">
                Gastos
              </span>
            </div>
            <div className="pl-4.5">
              <Amount value={comparison.expenses.toNumber()} currency={account.currency} size="sm" className="min-w-0 truncate" />
              <span className="text-xs text-muted-foreground ml-1">
                ({formatPercent(comparison.expensePercentage, preferences)})
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </AccountsCard>
  );
}
