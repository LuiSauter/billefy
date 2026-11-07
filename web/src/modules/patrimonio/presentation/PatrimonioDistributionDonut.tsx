"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AssetCategorySummary } from "../domain/patrimonio.types";
import { Home, TrendingUp, Laptop, Car, Banknote, Sparkles } from "lucide-react";

interface PatrimonioDistributionDonutProps {
  categories: AssetCategorySummary[];
  totalAssets: number;
  currency?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  home: Home,
  "trending-up": TrendingUp,
  laptop: Laptop,
  car: Car,
  banknote: Banknote,
  sparkles: Sparkles,
};

export function PatrimonioDistributionDonut({
  categories,
  totalAssets,
  currency = "$",
}: PatrimonioDistributionDonutProps) {
  const chartData = categories.length > 0
    ? categories
    : [{ category: "other" as const, label: "Sin activos", color: "#64748b", totalValue: 1, percentage: 100, itemsCount: 0, description: "", icon: "sparkles" }];

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col justify-between h-full">
      <h3 className="text-base font-bold text-foreground tracking-tight mb-3">
        Distribución del patrimonio (activos)
      </h3>

      <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
        {/* Donut Container */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center min-w-0 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as AssetCategorySummary;
                    return (
                      <div className="rounded-xl bg-popover/95 backdrop-blur-md border border-border/80 px-3 py-2 shadow-xl">
                        <p className="text-[11px] font-semibold text-muted-foreground">{data.label}</p>
                        <p className="text-xs font-bold text-foreground font-mono mt-0.5">
                          {currency} {data.totalValue.toLocaleString("en-US")} ({data.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={chartData}
                dataKey="totalValue"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={74}
                paddingAngle={3}
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
            <span className="text-sm font-black text-foreground font-mono tracking-tight leading-tight">
              {currency} {totalAssets.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">
              Activos totales
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 flex flex-col gap-2.5 w-full">
          {categories.map((item) => {
            const Icon = ICON_MAP[item.icon] || Sparkles;
            return (
              <div
                key={item.category}
                className="flex items-center justify-between text-xs font-medium"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="p-1 rounded-md text-white shrink-0"
                    style={{ backgroundColor: item.color }}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="text-muted-foreground font-semibold truncate">
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-foreground font-mono font-bold">
                    {item.percentage}%
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                    {currency} {item.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            );
          })}

          {categories.length === 0 && (
            <span className="text-xs text-muted-foreground italic">
              Sin datos de activos
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
