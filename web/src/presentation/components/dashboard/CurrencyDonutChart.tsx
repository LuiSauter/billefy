"use client";

import React, { useMemo } from "react";
import { Pie, PieChart, Cell } from "recharts";
import { AccountDto } from "@/domain/models/types";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface CurrencyDonutChartProps {
  accounts: AccountDto[];
  p2pRate?: number;
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

const chartConfig = {
  BOB: { label: "Bolivianos (BOB)", color: "var(--chart-1)" },
  USD: { label: "Dólares (USD)", color: "var(--chart-2)" },
  USDT: { label: "Tether (USDT)", color: "var(--chart-3)" },
  Other: { label: "Otras", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function CurrencyDonutChart({ accounts, p2pRate = 9.85 }: CurrencyDonutChartProps) {
  const { data, totalBob } = useMemo(() => {
    let bob = 0;
    let usd = 0;
    let usdt = 0;
    let other = 0;

    for (const a of accounts) {
      const b = Number(a.balance) || 0;
      if (b <= 0) continue;
      if (a.currency === "BOB") bob += b;
      else if (a.currency === "USD") usd += b;
      else if (a.currency === "USDT") usdt += b;
      else other += b;
    }

    // Convert everything to BOB for proportional breakdown
    const bobTotalFromUsd = usd * p2pRate;
    const bobTotalFromUsdt = usdt * p2pRate;
    const total = bob + bobTotalFromUsd + bobTotalFromUsdt + other;

    const chartData = [
      { name: "BOB", value: Math.round(bob), rawValue: bob, currency: "BOB" },
      { name: "USD", value: Math.round(bobTotalFromUsd), rawValue: usd, currency: "USD" },
      { name: "USDT", value: Math.round(bobTotalFromUsdt), rawValue: usdt, currency: "USDT" },
    ].filter((d) => d.value > 0);

    return { data: chartData, totalBob: Math.round(total) };
  }, [accounts, p2pRate]);

  if (data.length === 0) return null;

  return (
    <div className="w-full rounded-2xl bg-card border border-border p-5 shadow-2xs flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Distribución por Moneda</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Valorado al cambio P2P (Bs. {p2pRate.toFixed(2)})
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-primary">
          Bs. {totalBob.toLocaleString()} total
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <ChartContainer config={chartConfig} className="h-44 w-44 aspect-square shrink-0">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={46}
              outerRadius={68}
              paddingAngle={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="flex-1 flex flex-col gap-2 w-full text-xs">
          {data.map((item, idx) => {
            const pct = totalBob > 0 ? Math.round((item.value / totalBob) * 100) : 0;
            return (
              <div
                key={item.name}
                className="flex items-center justify-between p-2 rounded-xl bg-muted/50 border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="font-semibold text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-muted-foreground">
                    {item.rawValue.toLocaleString()} {item.currency}
                  </span>
                  <strong className="text-foreground w-10 text-right">{pct}%</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
