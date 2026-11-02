"use client";

import React, { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown } from "lucide-react";
import {
  AccountsOverviewMetrics,
  calculateBalanceEvolution,
  EvolutionPoint,
} from "../domain/accounts-overview";
import { AccountDto, TransactionDto } from "../domain/ledger.types";
import { useNumberFormat } from "@/shared/hooks/use-number-format";

interface AccountsAnalyticsSidePanelsProps {
  metrics: AccountsOverviewMetrics;
  accounts: AccountDto[];
  transactions?: TransactionDto[];
  p2pRate?: number;
  currency?: "USD" | "BOB";
}

const CATEGORY_COLORS: Record<string, string> = {
  bancos: "#3b82f6", // Blue
  wallets: "#a855f7", // Purple
  cripto: "#f59e0b", // Amber/Gold
  efectivo: "#10b981", // Teal/Emerald
  otros: "#64748b", // Slate
};

export function AccountsAnalyticsSidePanels({
  metrics,
  accounts,
  transactions = [],
  p2pRate = 9.85,
  currency = "USD",
}: AccountsAnalyticsSidePanelsProps) {
  const format = useNumberFormat();
  const [timeframeMonths, setTimeframeMonths] = useState<number>(6);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isUsd = currency === "USD";
  const displayTotal = isUsd ? metrics.totalUsd : metrics.totalBob;
  const currencySymbol = isUsd ? "$" : "Bs.";

  // Donut data
  const donutData = useMemo(() => {
    return metrics.categoryList
      .filter((cat) => cat.amount > 0)
      .map((cat) => ({
        name: cat.label,
        group: cat.group,
        value: cat.amount,
        percentage: cat.percentage,
        color: CATEGORY_COLORS[cat.group] || cat.color,
      }));
  }, [metrics.categoryList]);

  // Evolution data
  const evolutionData = useMemo(() => {
    return calculateBalanceEvolution(accounts, transactions, p2pRate, timeframeMonths);
  }, [accounts, transactions, p2pRate, timeframeMonths]);

  const latestPoint = evolutionData[evolutionData.length - 1];

  const formatK = (value: number) => {
    if (value >= 1000) {
      return `${Math.round(value / 1000)}K`;
    }
    return `${value}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Panel 1: Distribución del saldo */}
      <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col gap-4">
        <h3 className="text-base font-bold text-foreground tracking-tight">
          Distribución del saldo
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Donut Container with Center Text */}
          <div className="relative w-44 h-44 shrink-0 flex items-center justify-center min-w-0 min-h-0">
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {donutData.map((entry) => (
                      <Cell key={`cell-${entry.group}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-36 h-36 rounded-full border-4 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground text-center p-2">
                Sin saldos
              </div>
            )}

            {/* Centered Total inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
              <span className="text-sm font-black text-foreground font-mono tracking-tight leading-tight">
                {currencySymbol} {format(displayTotal)}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                Total en cuentas
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 flex flex-col gap-2.5 w-full">
            {metrics.categoryList.map((cat) => {
              const color = CATEGORY_COLORS[cat.group] || cat.color;
              return (
                <div
                  key={cat.group}
                  className="flex items-center justify-between text-xs font-medium"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-muted-foreground font-semibold truncate">
                      {cat.label}
                    </span>
                  </div>
                  <span className="text-foreground font-mono font-bold">
                    {cat.percentage.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Panel 2: Evolución del saldo en cuentas */}
      <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Evolución del saldo en cuentas
          </h3>

          {/* Timeframe selector dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="h-7 px-2.5 rounded-lg bg-muted/60 hover:bg-muted text-[11px] font-bold text-foreground flex items-center gap-1.5 transition border border-border/60 cursor-pointer"
            >
              <span>Últimos {timeframeMonths} meses</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-8 w-36 rounded-xl bg-popover border border-border shadow-xl py-1 z-30 flex flex-col text-xs font-semibold">
                {[3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setTimeframeMonths(m);
                      setDropdownOpen(false);
                    }}
                    className={`px-3 py-1.5 text-left transition ${
                      timeframeMonths === m
                        ? "text-primary bg-primary/10 font-bold"
                        : "text-foreground hover:bg-muted font-medium"
                    }`}
                  >
                    Últimos {m} meses
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Highlight pill of current total */}
        {latestPoint && (
          <div className="flex justify-end">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-xs font-mono">
              $ {format(latestPoint.balance)}
            </span>
          </div>
        )}

        {/* Area Chart */}
        <div className="w-full h-44 -ml-2 min-w-0 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="purpleAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatK}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as EvolutionPoint;
                    return (
                      <div className="rounded-xl bg-popover border border-border p-2.5 shadow-xl text-xs">
                        <p className="text-muted-foreground font-medium">{data.month}</p>
                        <p className="text-foreground font-black font-mono mt-0.5">
                          $ {format(data.balance)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#a855f7"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#purpleAreaGrad)"
                activeDot={{ r: 6, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
