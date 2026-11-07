import React, { useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { DebtMetrics } from "../../domain/lending-analytics";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";

const config = { balance: { label: "Saldo proyectado", color: "#a855f7" } };

export function DeudaPayoffProjectionCard({ metrics }: { metrics: DebtMetrics }) {
  const format = useNumberFormat();
  const gradientId = `debt-projection-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Proyección de pago</h2>
        <Badge variant="outline">Próximos 12 meses</Badge>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-56 w-full" role="img" aria-label="Proyección del saldo de deuda a 12 meses">
          <AreaChart data={metrics.amortizationProjection} margin={{ top: 12, left: 0, right: 12, bottom: 0 }}>
            <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-balance)" stopOpacity={0.6} /><stop offset="100%" stopColor="var(--color-balance)" stopOpacity={0.02} /></linearGradient></defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={72} tickFormatter={(value: number) => format(value)} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${format(String(value))} ${metrics.currency}`} />} />
            <Area type="monotone" dataKey="balance" stroke="var(--color-balance)" strokeWidth={2} fill={`url(#${gradientId})`} dot={{ r: 3, fill: "var(--color-balance)" }} isAnimationActive={false} />
          </AreaChart>
        </ChartContainer>
        <p className="mt-3 text-center text-xs text-muted-foreground">Saldo proyectado · {metrics.currency} · Saldo al cierre de cada mes</p>
        <p className="mt-2 text-xs text-muted-foreground">Según cuotas pendientes, sin abonos extra. Los vencidos se consideran pagados este mes.</p>
        <table className="sr-only">
          <caption>Saldo proyectado por mes</caption>
          <thead><tr><th scope="col">Mes</th><th scope="col">Saldo</th></tr></thead>
          <tbody>{metrics.amortizationProjection.map((point) => <tr key={point.month}><th scope="row">{point.month}</th><td>{format(point.balance)} {metrics.currency}</td></tr>)}</tbody>
        </table>
      </CardContent>
    </Card>
  );
}
