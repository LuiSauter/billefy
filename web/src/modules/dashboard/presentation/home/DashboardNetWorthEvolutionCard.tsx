"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatAmountText } from "@/shared/lib/amount-format";
import type { NetWorthEvolutionPoint } from "../../domain/dashboard-home-analytics";

interface DashboardNetWorthEvolutionCardProps {
  data: NetWorthEvolutionPoint[];
  selectedCurrency: string;
}

export function DashboardNetWorthEvolutionCard({
  data,
  selectedCurrency,
}: DashboardNetWorthEvolutionCardProps) {
  const numberPreferences = useNumberPreferences();

  const formatK = (val: number) =>
    formatAmountText(val, selectedCurrency, numberPreferences, { compact: true });

  return (
    <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden h-full flex flex-col justify-between">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-extrabold text-foreground">
          Evolución del patrimonio neto
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1 border-border bg-background hover:bg-muted text-foreground"
              >
                <span>Últimos 6 meses</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem className="font-bold text-purple-400">
              Últimos 6 meses
            </DropdownMenuItem>
            <DropdownMenuItem>Último año</DropdownMenuItem>
            <DropdownMenuItem>Histórico completo</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <div className="h-[170px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 280, height: 170 }}>
            <AreaChart data={data} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.0} />
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
                domain={["auto", "auto"]}
              />
              <Tooltip
                formatter={(val) => formatAmountText(Number(val), selectedCurrency, numberPreferences)}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderColor: "rgba(168, 85, 247, 0.4)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#a855f7"
                strokeWidth={2.5}
                fill="url(#netWorthGradient)"
                dot={{ r: 4, fill: "#a855f7", stroke: "#0f172a", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#c084fc", stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
