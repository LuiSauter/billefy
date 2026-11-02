"use client";

import React, { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AccountDto, TransactionDto } from "../../domain/ledger.types";
import { calculateCashFlowComparison } from "../../domain/account-detail";
import { useNumberFormat } from "@/shared/hooks/use-number-format";

interface AccountCashFlowDonutCardProps {
  account: AccountDto;
  transactions: TransactionDto[];
}

const COLOR_INCOME = "#10B981"; // Emerald
const COLOR_EXPENSE = "#F43F5E"; // Rose

export function AccountCashFlowDonutCard({
  account,
  transactions,
}: AccountCashFlowDonutCardProps) {
  const format = useNumberFormat();
  const currencySymbol = account.currency === "BOB" ? "Bs" : "$";

  const comparison = useMemo(() => {
    return calculateCashFlowComparison(transactions);
  }, [transactions]);

  const chartData = useMemo(() => {
    if (comparison.totalFlow.isZero()) {
      return [
        { name: "Sin movimientos", value: 1, color: "var(--muted)", isPlaceholder: true },
      ];
    }

    return [
      {
        name: "Ingresos",
        value: comparison.income.toNumber(),
        color: COLOR_INCOME,
        percentage: comparison.incomePercentage,
      },
      {
        name: "Gastos",
        value: comparison.expenses.toNumber(),
        color: COLOR_EXPENSE,
        percentage: comparison.expensePercentage,
      },
    ].filter((item) => item.value > 0);
  }, [comparison]);

  const formattedTotal = `${currencySymbol} ${format(comparison.totalFlow.toNumber())}`;
  const formattedIncome = `${currencySymbol} ${format(comparison.income.toNumber())}`;
  const formattedExpenses = `${currencySymbol} ${format(comparison.expenses.toNumber())}`;

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 flex flex-col justify-between gap-4 shadow-sm min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground tracking-tight">
          Entradas vs. Salidas
        </h3>
      </div>

      {/* Content: Donut + Legend */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-auto">
        {/* Donut Container with Center Label */}
        <div className="w-[180px] h-[180px] relative shrink-0 flex items-center justify-center">
          {/* Absolute Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span className="text-sm font-black text-foreground tracking-tight truncate max-w-[120px]">
              {formattedTotal}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              Total
            </span>
          </div>

          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    if (item.isPlaceholder) return null;
                    return (
                      <div className="rounded-xl bg-popover border border-border p-2 shadow-xl text-xs">
                        <span className="font-semibold text-foreground">
                          {item.name}: {currencySymbol} {format(item.value)} (
                          {item.percentage?.toFixed(1)}%)
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={chartData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={chartData.length > 1 ? 4 : 0}
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend on the right */}
        <div className="flex flex-col gap-3 min-w-[140px] w-full sm:w-auto">
          {/* Ingresos Row */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">
                Ingresos
              </span>
            </div>
            <div className="pl-4.5">
              <span className="text-xs sm:text-sm font-black text-foreground">
                {formattedIncome}
              </span>
              <span className="text-[11px] text-muted-foreground ml-1">
                ({comparison.incomePercentage.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Gastos Row */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">
                Gastos
              </span>
            </div>
            <div className="pl-4.5">
              <span className="text-xs sm:text-sm font-black text-foreground">
                {formattedExpenses}
              </span>
              <span className="text-[11px] text-muted-foreground ml-1">
                ({comparison.expensePercentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
