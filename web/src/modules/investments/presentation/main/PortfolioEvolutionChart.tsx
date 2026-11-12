"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PortfolioEvolutionPoint } from "../../domain/portfolio-analytics";
import { Amount } from "@/shared/ui/amount";

interface PortfolioEvolutionChartProps {
  points: PortfolioEvolutionPoint[];
  currentValue: number;
  currency?: string;
}

export function PortfolioEvolutionChart({
  points,
  currentValue,
  currency = "$",
}: PortfolioEvolutionChartProps) {
  const formatYAxis = (val: number) => {
    if (val >= 1000) {
      return `${Math.round(val / 1000)}K`;
    }
    return String(val);
  };

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-base font-bold text-foreground tracking-tight">
          Evolución del portafolio
        </h3>
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-purple-600 text-white shadow-xs">
          <Amount value={currentValue} currency={currency} size="inherit" tone="inherit" />
        </span>
      </div>

      <div className="w-full h-56 min-w-0 min-h-0 -ml-2">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={points} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.45} />
                <stop offset="85%" stopColor="#a855f7" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={6}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
              dx={-4}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as PortfolioEvolutionPoint;
                  return (
                    <div className="rounded-xl bg-popover/95 backdrop-blur-md border border-border/80 px-3 py-2 shadow-xl">
                      <p className="text-[11px] font-semibold text-muted-foreground">{data.month}</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">
                        <Amount value={data.value} currency={currency} size="inherit" tone="inherit" />
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#a855f7"
              strokeWidth={2.5}
              fill="url(#portfolioAreaGrad)"
              activeDot={{ r: 5, fill: "#c084fc", stroke: "#581c87", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
