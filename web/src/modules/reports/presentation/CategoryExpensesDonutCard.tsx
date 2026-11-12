"use client";

import React from "react";
import { Car, Cross, Ellipsis, Heart, House, Tag, Utensils } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatAmountText } from "@/shared/lib/amount-format";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import type { FinancialReport } from "../domain/reports-analytics";
import { Amount, Percentage } from "@/shared/ui/amount";

interface CategoryExpensesDonutCardProps {
  data: FinancialReport["categoryExpenses"];
  totalExpenses: number;
  selectedCurrency: string;
}

const colors = ["#a855f7", "#0ea5e9", "#34d399", "#fb7185", "#facc15", "#a5b4fc"];
const categoryIcons: Record<string, typeof Tag | undefined> = {
  vivienda: House, alimentación: Utensils, transporte: Car,
  "estilo de vida": Heart, salud: Cross, otros: Ellipsis,
};

export function CategoryExpensesDonutCard({ data, totalExpenses, selectedCurrency }: CategoryExpensesDonutCardProps) {
  const preferences = useNumberPreferences();
  const money = (value: number | string) => formatAmountText(value, selectedCurrency, preferences);

  return (
    <Card className="h-full min-w-0 border-border/80">
      <CardHeader><h2 className="text-lg font-bold tracking-tight">Gastos por categoría</h2></CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col 2xl:flex-row">
        <div className="relative size-48 min-w-0 shrink-0">
          {data.length > 0 && totalExpenses > 0 && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 192, height: 192 }}>
              <PieChart aria-label={`Distribución de gastos en ${selectedCurrency}`}>
                <Tooltip
                  formatter={(value) => value == null ? "" : money(String(value))}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }}
                />
                <Pie data={data} dataKey="amount" nameKey="category" innerRadius="68%" outerRadius="98%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
                  {data.map((item, index) => <Cell key={item.category} fill={colors[index % colors.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-full px-8 text-center ${data.length === 0 ? "border-8 border-muted" : ""}`}>
            <span className="max-w-full break-words text-sm font-bold tabular-nums"><Amount value={totalExpenses} currency={selectedCurrency} size="inherit" tone="inherit" /></span>
            <span className="mt-1 text-xs text-muted-foreground">Total de gastos</span>
          </div>
        </div>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin gastos en este período</p>
        ) : (
          <ul className="w-full min-w-0 flex-1 space-y-2.5 text-xs">
            {data.map((item, index) => {
              const Icon = categoryIcons[item.category.toLocaleLowerCase("es")] ?? Tag;
              const color = colors[index % colors.length];
              return (
                <li key={item.category} className="flex items-center gap-2">
                  <Badge variant="outline" aria-hidden="true" className="size-7 rounded-lg p-0" style={{ color, backgroundColor: `${color}20`, borderColor: `${color}40` }}>
                    <Icon className="size-4" />
                  </Badge>
                  <span className="min-w-0 flex-1 truncate" title={item.category}>{item.category}</span>
                  <span className="shrink-0 tabular-nums"><Percentage value={item.percentage} sign="never" size="inherit" tone="inherit" /></span>
                  <span className="ml-2 shrink-0 text-right font-semibold tabular-nums"><Amount value={item.amount} currency={selectedCurrency} size="inherit" tone="inherit" /></span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
