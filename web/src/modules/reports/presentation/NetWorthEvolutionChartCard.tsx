"use client";

import React, { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import type { FinancialReport } from "../domain/reports-analytics";

interface NetWorthEvolutionChartCardProps {
  /** Chronological values already converted to selectedCurrency by the domain engine. */
  data: FinancialReport["netWorthEvolution"];
  selectedCurrency: string;
}

export function NetWorthEvolutionChartCard({ data, selectedCurrency }: NetWorthEvolutionChartCardProps) {
  const format = useNumberFormat();
  const gradientId = `net-worth-${useId().replace(/:/g, "")}`;
  const money = (value: number | string) => `${format(value)} ${selectedCurrency}`;
  const latest = data.at(-1);

  return (
    <Card className="h-full min-w-0 border-border/80">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight">Evolución del patrimonio neto</h2>
        <Badge variant="outline" className="border-purple-500/50 bg-purple-500/10 tabular-nums" title="Último patrimonio neto">
          {latest ? money(latest.netWorth) : "—"}
        </Badge>
      </CardHeader>
      <CardContent>
        {latest ? (
          <>
            <div className="h-56 min-w-0" role="img" aria-label={`Evolución del patrimonio neto por mes en ${selectedCurrency}`}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 480, height: 224 }}>
                <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} width={80} tickFormatter={(value: number) => format(value)} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => value == null ? "" : money(String(value))}
                    labelFormatter={(_, payload) => payload[0]?.payload?.monthKey ?? ""}
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }}
                  />
                  <Area type="monotone" dataKey="netWorth" name="Patrimonio neto" stroke="#a855f7" strokeWidth={3} fill={`url(#${gradientId})`} dot={{ r: 3, fill: "var(--background)", strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Patrimonio neto por mes ({selectedCurrency})</caption>
              <thead><tr><th>Mes</th><th>Patrimonio neto</th></tr></thead>
              <tbody>{data.map((point) => <tr key={point.monthKey}><th scope="row">{point.monthKey}</th><td>{money(point.netWorth)}</td></tr>)}</tbody>
            </table>
          </>
        ) : (
          <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">Sin datos de patrimonio en este período</p>
        )}
      </CardContent>
    </Card>
  );
}
