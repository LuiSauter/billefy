"use client";

import React, { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { AccountDto, TransactionDto } from "../../domain/ledger.types";
import { calculateBalanceEvolutionPoints } from "../../domain/account-detail";
import { useNumberFormat, useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatAmountText } from "@/shared/lib/amount-format";

interface AccountBalanceEvolutionChartProps {
  account: AccountDto;
  transactions: TransactionDto[];
}

export function AccountBalanceEvolutionChart({
  account,
  transactions,
}: AccountBalanceEvolutionChartProps) {
  const format = useNumberFormat();
  const preferences = useNumberPreferences();
  const [range, setRange] = useState<"1m" | "3m" | "6m" | "1y">("6m");

  const data = useMemo(() => {
    return calculateBalanceEvolutionPoints(account, transactions, range);
  }, [account, transactions, range]);

  const latestPoint = data[data.length - 1];

  const formatYAxis = (val: number) => {
    if (val >= 1000) return `${format(val / 1000)}K`;
    return format(val);
  };

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 flex flex-col gap-4 shadow-sm min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-foreground tracking-tight">
          Evolución del saldo
        </h3>

        {/* Range Dropdown */}
        <div className="relative">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as "1m" | "3m" | "6m" | "1y")}
            className="appearance-none bg-muted/60 hover:bg-muted border border-border text-foreground text-xs font-semibold rounded-xl pl-3 pr-7 py-1.5 transition cursor-pointer outline-none focus:border-purple-500"
          >
            <option value="1m">Últimos 30 días</option>
            <option value="3m">Últimos 3 meses</option>
            <option value="6m">Últimos 6 meses</option>
            <option value="1y">Este año</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[220px] relative pt-2">
        {/* Floating Callout for Current Balance in the upper right or on top of last point */}
        {latestPoint && (
          <div className="absolute top-2 right-4 z-10 bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-xs pointer-events-none">
            {formatAmountText(latestPoint.balance, account.currency, preferences)}
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={data} margin={{ top: 20, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="purpleBalanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
              opacity={0.35}
            />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 }}
              dy={6}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 }}
              domain={["auto", "auto"]}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const val = payload[0].value as number;
                  const label = payload[0].payload.label;
                  return (
                    <div className="rounded-xl bg-popover border border-border p-2.5 shadow-xl text-xs flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {label}
                      </span>
                      <span className="font-bold text-foreground text-sm">
                        {formatAmountText(val, account.currency, preferences)}
                      </span>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="balance"
              stroke="#A855F7"
              strokeWidth={2.5}
              fill="url(#purpleBalanceGradient)"
              dot={{
                r: 3.5,
                fill: "#FFFFFF",
                stroke: "#8B5CF6",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 5,
                fill: "#8B5CF6",
                stroke: "#FFFFFF",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
