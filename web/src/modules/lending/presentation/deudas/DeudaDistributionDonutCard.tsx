import React from "react";
import { Cell, Pie, PieChart } from "recharts";
import type { DebtMetrics } from "../../domain/lending-analytics";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";

const categoryColors = ["var(--color-hipoteca)", "var(--color-tarjetas)", "var(--color-personal)", "var(--color-vehicular)", "var(--color-otros)"];
const config = {
  total: { label: "Saldo" },
  hipoteca: { label: "Hipoteca", color: "#a855f7" },
  tarjetas: { label: "Tarjetas", color: "#0ea5e9" },
  personal: { label: "Personal", color: "#34d399" },
  vehicular: { label: "Vehicular", color: "#facc15" },
  otros: { label: "Otros", color: "#e879f9" },
};
const legendColors = ["#a855f7", "#0ea5e9", "#34d399", "#facc15", "#e879f9"];

export function DeudaDistributionDonutCard({ metrics }: { metrics: DebtMetrics }) {
  const format = useNumberFormat();
  return (
    <Card className="min-w-0">
      <CardHeader><h2 className="text-lg font-semibold">Distribución de deudas</h2></CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
        <div className="relative w-full max-w-56 shrink-0">
          <ChartContainer config={config} className="aspect-square w-full" role="img" aria-label="Distribución del saldo por tipo de deuda">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="category" formatter={(value) => `${format(String(value))} ${metrics.currency}`} />} />
              <Pie data={metrics.distribution} dataKey="total" nameKey="category" innerRadius="68%" outerRadius="95%" strokeWidth={0} isAnimationActive={false}>
                {metrics.distribution.map((item, index) => <Cell key={item.category} fill={categoryColors[index]} />)}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <span className="text-base font-bold tabular-nums">{format(metrics.totalDebt)}</span>
            <span className="text-xs text-muted-foreground">{metrics.currency} · Deuda total</span>
          </div>
        </div>
        <ul className="w-full min-w-0 flex-1 divide-y divide-border text-sm">
          {metrics.distribution.map((item, index) => (
            <li key={item.category} className="flex items-center justify-between gap-3 py-2">
              <span className="flex items-center gap-2"><span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: legendColors[index] }} aria-hidden="true" />{item.category}</span>
              <span className="font-semibold tabular-nums">{format(item.percentage)}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
