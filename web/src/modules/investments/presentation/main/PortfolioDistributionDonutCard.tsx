"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CategoryDistributionItem } from "../../domain/portfolio-analytics";

interface PortfolioDistributionDonutCardProps {
  distribution: CategoryDistributionItem[];
  totalValue: number;
  currency?: string;
}

export function PortfolioDistributionDonutCard({
  distribution,
  totalValue,
  currency = "$",
}: PortfolioDistributionDonutCardProps) {
  const chartData = distribution.length > 0
    ? distribution
    : [{ kind: "other" as const, label: "Sin inversiones", color: "#64748b", totalValue: 1, percentage: 100, count: 0 }];

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col justify-between h-full">
      <h3 className="text-base font-bold text-foreground tracking-tight mb-3">
        Distribución por tipo de inversión
      </h3>

      <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
        {/* Donut Container */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center min-w-0 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as CategoryDistributionItem;
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
              {currency} {totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">
              Total invertido
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 flex flex-col gap-2.5 w-full">
          {distribution.map((item) => (
            <div
              key={item.kind}
              className="flex items-center justify-between text-xs font-medium"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground font-semibold truncate">
                  {item.label}
                </span>
              </div>
              <span className="text-foreground font-mono font-bold ml-2">
                {item.percentage}%
              </span>
            </div>
          ))}
          {distribution.length === 0 && (
            <span className="text-xs text-muted-foreground italic">
              Sin datos de distribución
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
