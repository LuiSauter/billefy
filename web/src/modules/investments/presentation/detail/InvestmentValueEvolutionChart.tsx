"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, Calendar } from "lucide-react";
import { AssetEvolutionPoint } from "../../domain/investment-detail";

interface InvestmentValueEvolutionChartProps {
  points: AssetEvolutionPoint[];
  currentValue: number;
  currency?: string;
  onPeriodChange?: (months: number) => void;
}

const PERIOD_CHOICES = [
  { label: "Últimos 6 meses", months: 6 },
  { label: "Últimos 3 meses", months: 3 },
  { label: "Último año", months: 12 },
  { label: "Todo", months: 24 },
];

export function InvestmentValueEvolutionChart({
  points,
  currentValue,
  currency = "$",
  onPeriodChange,
}: InvestmentValueEvolutionChartProps) {
  const [selectedLabel, setSelectedLabel] = useState("Últimos 6 meses");
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
          Evolución del valor
        </h3>

        <div className="flex items-center gap-2">
          {/* Tag with latest valuation */}
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs font-mono">
            {currency} {currentValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>

          {/* Period selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="h-8 px-2.5 rounded-lg border border-border/80 bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span>{selectedLabel}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-40 rounded-xl bg-card border border-border shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                {PERIOD_CHOICES.map((choice) => (
                  <button
                    key={choice.label}
                    type="button"
                    onClick={() => {
                      setSelectedLabel(choice.label);
                      setDropdownOpen(false);
                      onPeriodChange?.(choice.months);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted cursor-pointer"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full h-56 min-w-0 min-h-0 -ml-2">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={points} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="emeraldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="85%" stopColor="#10b981" stopOpacity={0.02} />
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
                  const data = payload[0].payload as AssetEvolutionPoint;
                  return (
                    <div className="rounded-xl bg-popover/95 backdrop-blur-md border border-border/80 px-3 py-2 shadow-xl">
                      <p className="text-[11px] font-semibold text-muted-foreground">{data.month}</p>
                      <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                        {currency} {data.value.toLocaleString("en-US")}
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
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#emeraldAreaGrad)"
              activeDot={{ r: 5, fill: "#34d399", stroke: "#064e3b", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
