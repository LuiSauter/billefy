"use client";

import React, { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { getActiveFlowTransactions } from "@/modules/ledger/domain/monthly-analytics";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";
import { useNumberFormat } from "@/shared/hooks/use-number-format";

interface CashFlowAreaChartProps {
  transactions: TransactionDto[];
  currencySymbol?: string;
}

const chartConfig = {
  income: {
    label: "Ingresos",
    color: "var(--chart-2)",
  },
  expense: {
    label: "Gastos",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export function CashFlowAreaChart({
  transactions,
  currencySymbol = "Bs.",
}: CashFlowAreaChartProps) {
  const format = useNumberFormat();
  const data = useMemo(() => {
    // Group transactions by day (or synthetic 7-day flow if empty)
    if (!transactions || transactions.length === 0) {
      return [
        { label: "Lun", income: 0, expense: 0 },
        { label: "Mar", income: 0, expense: 0 },
        { label: "Mié", income: 0, expense: 0 },
        { label: "Jue", income: 0, expense: 0 },
        { label: "Vie", income: 0, expense: 0 },
        { label: "Sáb", income: 0, expense: 0 },
        { label: "Dom", income: 0, expense: 0 },
      ];
    }

    const activeTxns = getActiveFlowTransactions(transactions);

    if (activeTxns.length === 0) {
      return [
        { label: "Lun", income: 0, expense: 0 },
        { label: "Mar", income: 0, expense: 0 },
        { label: "Mié", income: 0, expense: 0 },
        { label: "Jue", income: 0, expense: 0 },
        { label: "Vie", income: 0, expense: 0 },
        { label: "Sáb", income: 0, expense: 0 },
        { label: "Dom", income: 0, expense: 0 },
      ];
    }

    const byDate = new Map<string, { income: number; expense: number }>();
    const sorted = [...activeTxns].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );

    for (const t of sorted) {
      const dateKey = new Date(t.occurredAt).toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "short",
      });
      const current = byDate.get(dateKey) || { income: 0, expense: 0 };
      const amountNum = Math.abs(Number(t.amount)) || 0;
      if (t.direction === "Income") {
        current.income += amountNum;
      } else {
        current.expense += amountNum;
      }
      byDate.set(dateKey, current);
    }

    // Keep last 7 buckets
    const entries = Array.from(byDate.entries()).slice(-7);
    return entries.map(([label, val]) => ({
      label,
      income: Math.round(val.income),
      expense: Math.round(val.expense),
    }));
  }, [transactions]);

  const totalIncome = data.reduce((acc, d) => acc + d.income, 0);
  const totalExpense = data.reduce((acc, d) => acc + d.expense, 0);

  return (
    <div className="w-full rounded-2xl bg-card border border-border p-5 shadow-2xs flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            Flujo de Caja (Última actividad)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ingresos vs. Gastos consolidados en el tiempo
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Ingresos:</span>
            <span className="text-emerald-400 font-mono font-bold">
              +{currencySymbol} {format(totalIncome)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-muted-foreground">Gastos:</span>
            <span className="text-rose-400 font-mono font-bold">
              -{currencySymbol} {format(totalExpense)}
            </span>
          </div>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-56 w-full">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="income"
            stroke="var(--color-income)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#fillIncome)"
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="var(--color-expense)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#fillExpense)"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
