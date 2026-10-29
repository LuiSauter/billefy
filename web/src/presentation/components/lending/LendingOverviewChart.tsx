"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { LoanSummaryDto } from "@/domain/models/types";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface LendingOverviewChartProps {
  loans: LoanSummaryDto[];
}

const chartConfig = {
  remainingPrincipal: {
    label: "Saldo Pendiente",
    color: "var(--chart-3)",
  },
  principal: {
    label: "Capital Inicial",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function LendingOverviewChart({ loans }: LendingOverviewChartProps) {
  if (!loans || loans.length === 0) return null;

  const data = loans.slice(0, 6).map((l) => ({
    name: l.counterpartyName.length > 14 ? l.counterpartyName.slice(0, 12) + "…" : l.counterpartyName,
    principal: Math.round(Number(l.principal)),
    remainingPrincipal: Math.round(Number(l.remainingPrincipal)),
  }));

  return (
    <div className="w-full rounded-2xl bg-card border border-border p-5 shadow-2xs flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Capital vs. Saldo Pendiente por Contraparte</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitoreo de amortización en préstamos activos
          </p>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-48 w-full">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
          <YAxis tickLine={false} axisLine={false} className="text-xs font-mono" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="principal" fill="var(--color-principal)" radius={[6, 6, 0, 0]} opacity={0.35} />
          <Bar dataKey="remainingPrincipal" fill="var(--color-remainingPrincipal)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
