"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import type { MonthlyCashFlow } from "../../domain/dashboard-home-analytics";

interface DashboardCashFlowCardProps {
  cashFlow: MonthlyCashFlow;
  selectedCurrency: string;
}

export function DashboardCashFlowCard({
  cashFlow,
  selectedCurrency,
}: DashboardCashFlowCardProps) {
  const format = useNumberFormat();
  const currencySymbol = selectedCurrency === "USD" ? "$" : "Bs";

  const chartData = [
    { name: "Ingresos", amount: cashFlow.income, color: "#10b981" },
    { name: "Gastos", amount: cashFlow.expenses, color: "#f43f5e" },
    { name: "Ahorro", amount: cashFlow.savings, color: "#a855f7" },
  ];

  const formatK = (val: number) => {
    if (val >= 1000) return `${Math.round(val / 1000)}K`;
    return `${val}`;
  };

  return (
    <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden h-full">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-extrabold text-foreground">
          Flujo del mes
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 pt-2 grid grid-cols-1 sm:grid-cols-[1.1fr_1.3fr] gap-4 items-center">
        {/* Left Side: Legend with Values */}
        <div className="flex flex-col gap-3">
          {/* Ingresos */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground">
                Ingresos
              </span>
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-foreground tabular-nums">
              {currencySymbol} {format(cashFlow.income)}
            </span>
          </div>

          {/* Gastos */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground">
                Gastos
              </span>
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-foreground tabular-nums">
              {currencySymbol} {format(cashFlow.expenses)}
            </span>
          </div>

          {/* Ahorro / Inversión */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground">
                Ahorro / Inversión
              </span>
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-foreground tabular-nums">
              {currencySymbol} {format(cashFlow.savings)}
            </span>
          </div>
        </div>

        {/* Right Side: Vertical Bar Chart */}
        <div className="h-[135px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 180, height: 135 }}>
            <BarChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatK}
              />
              <XAxis dataKey="name" hide />
              <Tooltip
                formatter={(val) => `${currencySymbol} ${format(Number(val))}`}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderColor: "rgba(148, 163, 184, 0.2)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "#fff",
                }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
