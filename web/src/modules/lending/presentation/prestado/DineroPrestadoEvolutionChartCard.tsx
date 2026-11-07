import React from "react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import type { LentMetrics } from "../../domain/lending-analytics";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";

const config = { lent: { label: "Prestado", color: "#a855f7" }, collected: { label: "Cobrado", color: "#34d399" } };

export function DineroPrestadoEvolutionChartCard({ metrics }: { metrics: LentMetrics }) {
  const format = useNumberFormat();
  return (
    <Card className="h-full min-w-0">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Evolución de cobros</h2>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-violet-500" aria-hidden="true" />Prestado</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-400" aria-hidden="true" />Cobrado</span>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-52 w-full" role="img" aria-label="Evolución mensual de préstamos y cobros">
          <ComposedChart data={metrics.monthlyEvolution} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8} />
            <YAxis width={65} axisLine={false} tickLine={false} tickFormatter={(value: number) => format(value)} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => `${name === "lent" ? "Prestado" : "Cobrado"}: ${format(String(value))} ${metrics.currency}`} />} />
            <Bar dataKey="lent" fill="var(--color-lent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="collected" fill="var(--color-collected)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Line dataKey="lent" stroke="var(--color-lent)" strokeWidth={2} dot={{ r: 3 }} tooltipType="none" isAnimationActive={false} />
          </ComposedChart>
        </ChartContainer>
        <p className="mt-3 text-xs text-muted-foreground">Flujos mensuales · {metrics.currency}. Cobrado incluye intereses; los KPI miden capital.</p>
        {!metrics.collectionHistoryComplete && <p role="note" className="mt-2 text-xs text-amber-500">Historial de cobros incompleto: faltan detalles de algunos préstamos. Solo se muestran pagos con fecha confirmada.</p>}
        <table className="sr-only">
          <caption>Evolución mensual de préstamos y cobros</caption>
          <thead><tr><th scope="col">Mes</th><th scope="col">Prestado</th><th scope="col">Cobrado</th></tr></thead>
          <tbody>{metrics.monthlyEvolution.map((point) => <tr key={point.month}><th scope="row">{point.month}</th><td>{format(point.lent)} {metrics.currency}</td><td>{format(point.collected)} {metrics.currency}</td></tr>)}</tbody>
        </table>
      </CardContent>
    </Card>
  );
}
