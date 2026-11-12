"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Investment } from "../../domain/investment.types";
import { Amount, Percentage } from "@/shared/ui/amount";

interface InvestmentPortfolioShareDonutCardProps {
  currentInvestment: Investment;
  allInvestments: Investment[];
  currency?: string;
}

const PALETTE = ["#10b981", "#a855f7", "#06b6d4", "#f59e0b", "#64748b", "#ec4899"];

export function InvestmentPortfolioShareDonutCard({
  currentInvestment,
  allInvestments,
  currency = "$",
}: InvestmentPortfolioShareDonutCardProps) {
  const totalPortfolioValue = allInvestments.reduce((acc, i) => acc + (i.currentValue || 0), 0);

  // Put current investment first, then remaining top investments
  const sorted = [...allInvestments].sort((a, b) => {
    if (a.id === currentInvestment.id) return -1;
    if (b.id === currentInvestment.id) return 1;
    return b.currentValue - a.currentValue;
  });

  const topItems = sorted.slice(0, 5).map((inv, idx) => {
    const pct = totalPortfolioValue > 0 ? (inv.currentValue / totalPortfolioValue) * 100 : 0;
    return {
      id: inv.id,
      name: inv.name,
      value: inv.currentValue,
      percentage: Number(pct.toFixed(1)),
      color: inv.id === currentInvestment.id ? "#10b981" : PALETTE[(idx + 1) % PALETTE.length],
      isCurrent: inv.id === currentInvestment.id,
    };
  });

  const currentItem = topItems.find((t) => t.isCurrent);
  const currentPct = currentItem ? currentItem.percentage : 0;

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col justify-between h-full">
      <h3 className="text-base font-bold text-foreground tracking-tight mb-3">
        Distribución en mi portafolio
      </h3>

      <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center min-w-0 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as (typeof topItems)[0];
                    return (
                      <div className="rounded-xl bg-popover/95 backdrop-blur-md border border-border/80 px-3 py-2 shadow-xl">
                        <p className="text-[11px] font-semibold text-muted-foreground">{data.name}</p>
                        <p className="text-xs font-bold text-foreground mt-0.5">
                          <Amount value={data.value} currency={currency} size="inherit" tone="inherit" /> (<Percentage value={data.percentage} sign="never" size="inherit" tone="inherit" />)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={topItems}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={74}
                paddingAngle={3}
                stroke="none"
              >
                {topItems.map((entry, index) => (
                  <Cell key={`donut-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
            <span className="text-base font-black text-foreground tracking-tight leading-tight">
              {currentPct}%
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">
              del total
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2.5 w-full">
          {topItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between text-xs font-medium ${
                item.isCurrent ? "font-bold text-foreground" : "text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.name}</span>
              </div>
              <span className="font-mono font-bold ml-2 text-foreground">
                <Percentage value={item.percentage} sign="never" size="inherit" tone="inherit" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
