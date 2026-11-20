"use client";

import React, { useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { TransactionDto } from "@/modules/ledger/domain/ledger.types";
import {
  getActiveTransactions,
  getAvailableMonths,
  monthKey,
  monthLabel,
  toBob,
} from "@/modules/ledger/domain/monthly-analytics";
import { CATEGORY_COLOR_THEMES } from "@/modules/ledger/domain/category.types";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";
import { Amount } from "@/shared/ui/amount";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatAmountText, formatPercent } from "@/shared/lib/amount-format";

interface CategoryDistributionCardProps {
  direction: "Income" | "Expense";
  transactions: TransactionDto[];
  p2pRate: number;
}

const chartConfig = {} satisfies ChartConfig;
const FALLBACK_COLOR = "#64748b";

export function CategoryDistributionCard({
  direction,
  transactions,
  p2pRate,
}: CategoryDistributionCardProps) {
  const { findCategory } = useUserCategories();
  const preferences = useNumberPreferences();
  const months = useMemo(() => getAvailableMonths(transactions), [transactions]);
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const isIncome = direction === "Income";

  const { slices, total } = useMemo(() => {
    const totals = new Map<string, { name: string; value: number; color: string }>();
    let sum = 0;
    for (const t of getActiveTransactions(transactions)) {
      if (t.direction !== direction) continue;
      const d = new Date(t.occurredAt);
      if (isNaN(d.getTime()) || monthKey(d) !== month) continue;
      const cat = findCategory(t.categoryId);
      const key = cat?.id ?? "none";
      const value = toBob(Number(t.amount) || 0, t.currency, p2pRate);
      const entry = totals.get(key) ?? {
        name: cat?.name ?? "Sin categoría",
        color: cat ? CATEGORY_COLOR_THEMES[cat.colorKey]?.swatchHex ?? FALLBACK_COLOR : FALLBACK_COLOR,
        value: 0,
      };
      entry.value += value;
      totals.set(key, entry);
      sum += value;
    }
    return {
      slices: Array.from(totals.values()).sort((a, b) => b.value - a.value),
      total: sum,
    };
  }, [transactions, direction, month, findCategory, p2pRate]);

  return (
    <div className="w-full rounded-2xl bg-card border border-border p-5 shadow-2xs flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            {isIncome ? "Distribución de ingresos" : "Distribución de gastos"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Por categoría (en Bs.)</p>
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label="Mes"
          className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      {slices.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">
          Sin {isIncome ? "ingresos" : "gastos"} en este mes.
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative h-44 w-44 shrink-0">
            <ChartContainer config={chartConfig} className="h-44 w-44 aspect-square">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" formatter={(value, name) => (
                  <div className="flex min-w-0 flex-1 justify-between gap-2">
                    <span className="truncate text-muted-foreground">{name}</span>
                    <span className="shrink-0 font-sans font-medium text-foreground tabular-nums">
                      {formatAmountText(Number(value), "BOB", preferences)}
                    </span>
                  </div>
                )} />} />
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  stroke="none"
                >
                  {slices.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Total
              </span>
              <Amount value={total} currency="BOB" size="sm" />
            </div>
          </div>

          <ul className="flex-1 w-full flex flex-col gap-1.5 text-xs">
            {slices.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate font-semibold text-foreground">{s.name}</span>
                </span>
                <span className="font-bold text-muted-foreground shrink-0">
                  {formatPercent((s.value / total) * 100, preferences)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
