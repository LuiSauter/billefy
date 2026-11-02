"use client";

import React, { useMemo } from "react";
import { Info } from "lucide-react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { getActiveFlowTransactions, monthKey } from "@/modules/ledger/domain/monthly-analytics";
import { BudgetDto } from "../domain/planning.types";

interface MonthProjectionChartProps {
  transactions?: TransactionDto[];
  budgets?: BudgetDto[];
  month: string; // e.g. "2026-10"
  p2pRate?: number;
  totalLimit?: number;
  totalSpent?: number;
  formatMoney: (amount: number) => string;
}

export function MonthProjectionChart({
  transactions = [],
  budgets = [],
  month,
  p2pRate = 9.85,
  totalLimit = 5440,
  totalSpent = 0,
  formatMoney,
}: MonthProjectionChartProps) {
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const monthNum = parseInt(monthStr, 10) || new Date().getMonth() + 1;

  const totalDays = new Date(year, monthNum, 0).getDate();
  const now = new Date();
  const isCurrentMonth = monthKey(now) === month;

  // If viewing current month, currentDay is today's date (or 20 in demo mode).
  // If viewing a past month, all days are historical.
  const currentDay = isCurrentMonth
    ? Math.min(totalDays, Math.max(1, now.getDate()))
    : totalDays;

  // Calculate cumulative real expenses and budget-based projection
  const { chartData, projectedEnd } = useMemo(() => {
    const monthlyExpenses = getActiveFlowTransactions(transactions).filter((t) => {
      const d = new Date(t.occurredAt);
      return (
        t.direction === "Expense" &&
        !isNaN(d.getTime()) &&
        monthKey(d) === month
      );
    });

    const monthShort = new Date(year, monthNum - 1, 1).toLocaleDateString("es-ES", {
      month: "short",
    });

    // Milestone days for ticks: 1, 5, 10, 15, 20, 25, totalDays + currentDay
    const milestoneSet = new Set<number>([
      1,
      Math.min(5, totalDays),
      Math.min(10, totalDays),
      Math.min(15, totalDays),
      Math.min(20, totalDays),
      Math.min(25, totalDays),
      totalDays,
    ]);
    if (currentDay > 1 && currentDay < totalDays) {
      milestoneSet.add(currentDay);
    }
    const milestones = Array.from(milestoneSet).sort((a, b) => a - b);

    // Calculate programmed remaining budget across categories:
    // For each budgeted category: max(0, limitAmount - spentAmount)
    const hasCategoryBudgets = budgets.length > 0;
    let remainingProgrammedBudget = 0;
    if (hasCategoryBudgets) {
      remainingProgrammedBudget = budgets.reduce((acc, b) => {
        const lim = Number(b.limitAmount) || 0;
        const sp = Number(b.spentAmount) || 0;
        return acc + Math.max(0, lim - sp);
      }, 0);
    }

    // CASE 1: Real transactions are present in the month
    if (monthlyExpenses.length > 0) {
      const daySpending = new Array(totalDays + 1).fill(0);
      for (const t of monthlyExpenses) {
        const d = new Date(t.occurredAt);
        const day = d.getDate();
        const amount =
          t.currency === "BOB"
            ? Number(t.amount) || 0
            : (Number(t.amount) || 0) * (p2pRate || 1);
        if (day >= 1 && day <= totalDays) {
          daySpending[day] += amount;
        }
      }

      const cumulativeSpent: number[] = new Array(totalDays + 1).fill(0);
      let running = 0;
      for (let day = 1; day <= totalDays; day++) {
        running += daySpending[day];
        cumulativeSpent[day] = running;
      }

      const spentNow = cumulativeSpent[currentDay] || 0;
      const daysRemaining = totalDays - currentDay;

      // The projection formula based on the programmed budget:
      // Projected Total = Gasto Real hasta hoy + Presupuesto Restante Programado
      // If no category budgets are defined, uses the total distribution limit
      const remainingToSpend = hasCategoryBudgets
        ? remainingProgrammedBudget
        : Math.max(0, totalLimit - spentNow);

      const finalProjection =
        currentDay >= totalDays
          ? Math.round(spentNow)
          : Math.round(spentNow + remainingToSpend);

      const data = milestones.map((day) => {
        const label = `${day} ${monthShort.replace(".", "")}`;
        const isPast = day < currentDay;
        const isToday = day === currentDay;

        let real: number | null = null;
        let projected: number | null = null;

        if (isPast) {
          real = Math.round(cumulativeSpent[day]);
        } else if (isToday) {
          // Exactly identical value at currentDay to join the real area with the dashed line
          real = Math.round(spentNow);
          projected = Math.round(spentNow);
        } else {
          const fraction = daysRemaining > 0 ? (day - currentDay) / daysRemaining : 1;
          projected = Math.round(spentNow + remainingToSpend * fraction);
        }

        return { day, label, realSpent: real, projectedSpent: projected };
      });

      return { chartData: data, projectedEnd: finalProjection };
    }

    // When no transactions yet in the month:
    const spentNow = totalSpent > 0 ? totalSpent : 0;
    const remainingToSpend = hasCategoryBudgets
      ? remainingProgrammedBudget
      : Math.max(0, totalLimit - spentNow);
    const finalProjection = Math.round(spentNow + remainingToSpend);
    const daysRemaining = Math.max(1, totalDays - currentDay);

    const data = milestones.map((day) => {
      const label = `${day} ${monthShort.replace(".", "")}`;
      const isPast = day < currentDay;
      const isToday = day === currentDay;

      let real: number | null = null;
      let projected: number | null = null;

      if (isPast) {
        const fraction = currentDay > 0 ? day / currentDay : 0;
        real = Math.round(spentNow * fraction);
      } else if (isToday) {
        real = spentNow;
        projected = spentNow;
      } else {
        const fraction = daysRemaining > 0 ? (day - currentDay) / daysRemaining : 1;
        projected = Math.round(spentNow + remainingToSpend * fraction);
      }

      return { day, label, realSpent: real, projectedSpent: projected };
    });

    return { chartData: data, projectedEnd: finalProjection };
  }, [
    transactions,
    budgets,
    month,
    p2pRate,
    totalDays,
    currentDay,
    totalLimit,
    totalSpent,
    year,
    monthNum,
  ]);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-2xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
            Proyección del mes
          </h2>
          <span title="Gasto estimado al cierre de mes: Gasto real acumulado + Presupuesto programado pendiente de ejecutar">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 cursor-help" />
          </span>
        </div>
      </div>

      {/* Main Chart Area with right-aligned legend and floating projection badge */}
      <div className="flex flex-col md:flex-row items-stretch gap-4">
        {/* Chart Container */}
        <div className="relative flex-1 h-52 sm:h-56">
          {/* Floating Projection Badge directly over the end of the projection line */}
          <div className="absolute top-2 right-4 z-10 pointer-events-none flex flex-col items-center bg-card/95 border border-purple-500/40 px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-xs">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Proyección:
            </span>
            <span className="text-xs sm:text-sm font-black font-mono text-purple-600 dark:text-purple-300">
              {formatMoney(projectedEnd)}
            </span>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{
                  fontSize: 11,
                  fill: "var(--muted-foreground)",
                  fontFamily: "monospace",
                }}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="rounded-xl border border-border bg-popover text-popover-foreground p-2.5 text-xs font-sans shadow-xl flex flex-col gap-1">
                      <span className="font-bold text-foreground">{d?.label}</span>
                      {d?.realSpent !== null && (
                        <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">
                          Gasto real: {formatMoney(d.realSpent)}
                        </span>
                      )}
                      {d?.projectedSpent !== null && (
                        <span className="text-purple-700 dark:text-purple-300 font-mono font-semibold">
                          Gasto proyectado: {formatMoney(d.projectedSpent)}
                        </span>
                      )}
                    </div>
                  );
                }}
              />
              {/* Solid Purple Real Spent Area */}
              <Area
                type="monotone"
                dataKey="realSpent"
                stroke="#A855F7"
                strokeWidth={2.5}
                fill="url(#spendGrad)"
                connectNulls={false}
              />
              {/* Dashed Projected Spent Line originating from currentDay */}
              <Line
                type="monotone"
                dataKey="projectedSpent"
                stroke="#C084FC"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: "#C084FC" }}
                connectNulls={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Vertical Legend on Right Side (Matching docs/redesign/presupuesto.png) */}
        <div className="flex md:flex-col justify-center items-start gap-3 shrink-0 pt-1 md:pl-2 md:border-l md:border-border/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
            <span>Gasto real</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="w-3 border-t-2 border-dashed border-purple-400 shrink-0" />
            <span>Gasto proyectado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
