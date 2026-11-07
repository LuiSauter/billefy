"use client";

import React from "react";
import { Bitcoin, TrendingUp, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import type { TopInvestmentItem } from "../../domain/dashboard-home-analytics";

interface DashboardTopInvestmentsCardProps {
  investments: TopInvestmentItem[];
  selectedCurrency: string;
  onOpenInvestmentsTab?: () => void;
}

export function DashboardTopInvestmentsCard({
  investments,
  selectedCurrency,
  onOpenInvestmentsTab,
}: DashboardTopInvestmentsCardProps) {
  const format = useNumberFormat();
  const currencySymbol = selectedCurrency === "USD" ? "$" : "Bs";

  const getIcon = (type: string, name: string) => {
    const lower = `${type} ${name}`.toLowerCase();
    if (lower.includes("crypto") || lower.includes("btc") || lower.includes("bitcoin")) {
      return { icon: Bitcoin, bg: "bg-amber-500/15 border-amber-500/30 text-amber-400" };
    }
    if (lower.includes("fondo") || lower.includes("fund") || lower.includes("layer")) {
      return { icon: Layers, bg: "bg-blue-500/15 border-blue-500/30 text-blue-400" };
    }
    return { icon: TrendingUp, bg: "bg-purple-500/15 border-purple-500/30 text-purple-400" };
  };

  return (
    <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden h-full flex flex-col justify-between">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-extrabold text-foreground">
          Principales inversiones
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex flex-col justify-between flex-1">
        {investments.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 flex-1">
            <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground text-xs">Sin inversiones activas</span>
              <span className="text-[11px] text-muted-foreground">
                Comienza registrando tus posiciones en cripto, fondos o acciones.
              </span>
            </div>
            {onOpenInvestmentsTab && (
              <button
                type="button"
                onClick={onOpenInvestmentsTab}
                className="mt-1 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
              >
                + Ir a Inversiones
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/50">
            {investments.map((inv) => {
              const { icon: Icon, bg } = getIcon(inv.type, inv.name);
              return (
                <div
                  key={inv.id}
                  onClick={onOpenInvestmentsTab}
                  className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors -mx-4 px-4 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {inv.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs sm:text-sm font-extrabold tabular-nums text-foreground">
                      {currencySymbol} {format(inv.balance)}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/15 border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-full"
                    >
                      {inv.yieldRate >= 0 ? "+" : ""}{inv.yieldRate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
