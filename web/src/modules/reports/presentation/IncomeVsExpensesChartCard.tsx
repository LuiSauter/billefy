"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNumberFormat, useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatAmountText } from "@/shared/lib/amount-format";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import type { FinancialReport } from "../domain/reports-analytics";

interface IncomeVsExpensesChartCardProps {
  data: FinancialReport["cashFlowEvolution"];
  selectedCurrency: string;
}

const colors = { income: "#a855f7", expenses: "#fb7185" };

export function IncomeVsExpensesChartCard({ data, selectedCurrency }: IncomeVsExpensesChartCardProps) {
  const format = useNumberFormat();
  const preferences = useNumberPreferences();
  const money = (value: number | string) => formatAmountText(value, selectedCurrency, preferences);
  const hasMovements = data.some((point) => point.income !== 0 || point.expenses !== 0);

  return (
    <Card className="h-full min-w-0 border-border/80">
      <CardHeader><h2 className="text-lg font-bold tracking-tight">Ingresos vs. Gastos</h2></CardHeader>
      <CardContent>
        {hasMovements ? (
          <>
            <div className="h-56 min-w-0" role="img" aria-label={`Ingresos y gastos por mes en ${selectedCurrency}`}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 480, height: 224 }}>
                <BarChart data={data} margin={{ top: 12, right: 4, left: 0, bottom: 0 }} barGap={6}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(value: number) => format(value)} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => value == null ? "" : money(String(value))}
                    labelFormatter={(_, payload) => payload[0]?.payload?.monthKey ?? ""}
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }}
                    cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
                  />
                  <Bar dataKey="income" name="Ingresos" fill={colors.income} radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                  <Bar dataKey="expenses" name="Gastos" fill={colors.expenses} radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Ingresos y gastos por mes ({selectedCurrency})</caption>
              <thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th></tr></thead>
              <tbody>{data.map((point) => <tr key={point.monthKey}><th scope="row">{point.monthKey}</th><td>{money(point.income)}</td><td>{money(point.expenses)}</td></tr>)}</tbody>
            </table>
          </>
        ) : (
          <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">Sin movimientos en este período</p>
        )}
        <div className="mt-3 flex justify-center gap-6 text-xs" aria-label="Leyenda">
          <span className="flex items-center gap-2"><span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: colors.income }} />Ingresos</span>
          <span className="flex items-center gap-2"><span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: colors.expenses }} />Gastos</span>
        </div>
      </CardContent>
    </Card>
  );
}
