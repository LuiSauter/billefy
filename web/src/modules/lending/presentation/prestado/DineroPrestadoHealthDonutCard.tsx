import React from "react";
import { Cell, Pie, PieChart } from "recharts";
import type { LentMetrics } from "../../domain/lending-analytics";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";

const colors = ["#34d399", "#fbbf24", "#0ea5e9", "#a855f7"];
const config = { count: { label: "Préstamos" } };

export function DineroPrestadoHealthDonutCard({ metrics }: { metrics: LentMetrics }) {
  const format = useNumberFormat();
  return (
    <Card className="h-full min-w-0">
      <CardHeader><h2 className="text-lg font-semibold">Estado de préstamos</h2></CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
        <div className="relative w-full max-w-44 shrink-0">
          <ChartContainer config={config} className="aspect-square w-full" role="img" aria-label="Distribución de salud de los préstamos">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
              <Pie data={metrics.healthBreakdown} dataKey="count" nameKey="status" innerRadius="68%" outerRadius="95%" strokeWidth={0} isAnimationActive={false}>
                {metrics.healthBreakdown.map((item, index) => <Cell key={item.status} fill={colors[index]} />)}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold tabular-nums">{metrics.activeLoansCount + metrics.completedLoansCount}</span>
            <span className="text-xs text-muted-foreground">Préstamos</span>
          </div>
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-3 text-xs">
          {metrics.healthBreakdown.map((item, index) => (
            <li key={item.status} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index] }} aria-hidden="true" />{item.status}</span>
              <span className="whitespace-nowrap tabular-nums">{item.count} ({format(item.percentage)}%)</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
