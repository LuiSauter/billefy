"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BudgetDto } from "@/modules/planning/domain/planning.types";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";

interface BudgetsComparisonChartProps {
  budgets: BudgetDto[];
}

const chartConfig = {
  spentAmount: { label: "Gastado", color: "var(--chart-5)" },
  limitAmount: { label: "Tope", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function BudgetsComparisonChart({ budgets }: BudgetsComparisonChartProps) {
  if (!budgets || budgets.length === 0) return null;

  const data = budgets.map((b) => ({
    name: b.categoryId || "General",
    spentAmount: Math.round(b.spentAmount),
    limitAmount: Math.round(b.limitAmount),
  }));

  return (
    <div className="w-full rounded-2xl bg-card border border-border p-5 shadow-2xs flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Gasto vs. Límite por Categoría</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comparativo en tiempo real del mes en curso
          </p>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-52 w-full">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
          <YAxis tickLine={false} axisLine={false} className="text-xs font-mono" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="limitAmount" fill="var(--color-limitAmount)" radius={[6, 6, 0, 0]} opacity={0.3} />
          <Bar dataKey="spentAmount" fill="var(--color-spentAmount)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
