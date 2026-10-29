"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FinancialHealthDto } from "@/modules/planning/domain/planning.types";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";

interface Split503020ChartProps {
  health: FinancialHealthDto | null;
}

const chartConfig = {
  presupuesto: {
    label: "Regla 50/30/20 (Sugerido)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function Split503020Chart({ health }: Split503020ChartProps) {
  if (!health) return null;

  const { split503020, monthlyIncome } = health;

  const data = [
    {
      category: "Necesidades (50%)",
      monto: Math.round(split503020.needsTarget),
      pct: "50%",
      fill: "var(--chart-1)",
    },
    {
      category: "Deseos (30%)",
      monto: Math.round(split503020.wantsTarget),
      pct: "30%",
      fill: "var(--chart-3)",
    },
    {
      category: "Ahorro / Inversión (20%)",
      monto: Math.round(split503020.savingsTarget),
      pct: "20%",
      fill: "var(--chart-2)",
    },
  ];

  return (
    <div className="w-full rounded-2xl bg-card border border-border p-5 shadow-2xs flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Distribución Regla 50 / 30 / 20</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Presupuesto ideal sobre tu ingreso mensual estimado
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-primary">
          Ingreso: Bs. {monthlyIncome.toLocaleString()}
        </span>
      </div>

      <ChartContainer config={chartConfig} className="h-44 w-full">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} className="text-xs font-mono" />
          <YAxis
            type="category"
            dataKey="category"
            tickLine={false}
            axisLine={false}
            className="text-xs font-medium"
            width={140}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="monto" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
