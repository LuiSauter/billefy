"use client";

import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Amount } from "@/shared/ui/amount";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatAmountText, formatPercent } from "@/shared/lib/amount-format";
import type { CategoryExpenseItem } from "../../domain/dashboard-home-analytics";

interface DashboardCategoryExpensesCardProps {
  categories: CategoryExpenseItem[];
  totalExpenses: number;
  selectedCurrency: string;
}

export function DashboardCategoryExpensesCard({
  categories,
  totalExpenses,
  selectedCurrency,
}: DashboardCategoryExpensesCardProps) {
  const numberPreferences = useNumberPreferences();

  return (
    <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden h-full">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-extrabold text-foreground">
          Gastos por categoría
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        {categories.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Tag className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground text-xs">Sin gastos este mes</span>
              <span className="text-[11px] text-muted-foreground">
                Tus consumos clasificados aparecerán aquí automáticamente.
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1.3fr] gap-4 items-center">
            {/* Left Side: Donut Chart with Center Text */}
            <div className="relative w-full h-[150px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 150, height: 150 }}>
                <PieChart>
                  <Tooltip
                    formatter={(val) => formatAmountText(Number(val), selectedCurrency, numberPreferences)}
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "rgba(148, 163, 184, 0.2)",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "#fff",
                    }}
                  />
                  <Pie
                    data={categories}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {categories.map((entry) => (
                      <Cell key={`cell-${entry.id}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Label inside Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <Amount value={totalExpenses} currency={selectedCurrency} size="sm" />
                <span className="text-[10px] text-muted-foreground font-medium">
                  Gastos del mes
                </span>
              </div>
            </div>

            {/* Right Side: Category Breakdown List */}
            <div className="flex flex-col gap-1.5 justify-center">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-muted-foreground font-medium truncate text-[11px]">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground font-bold tabular-nums">
                      {formatPercent(cat.percentage, numberPreferences)}
                    </span>
                    <Amount value={cat.amount} currency={selectedCurrency} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
