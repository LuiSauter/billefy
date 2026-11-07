"use client";

import React from "react";
import {
  Layers,
  Landmark,
  CreditCard,
  Wallet,
  ArrowUp,
  ArrowDown,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import type { DashboardHeroKpis } from "../../domain/dashboard-home-analytics";

interface DashboardHeroKpiCardsProps {
  kpis: DashboardHeroKpis;
  selectedCurrency: string;
}

export function DashboardHeroKpiCards({
  kpis,
  selectedCurrency,
}: DashboardHeroKpiCardsProps) {
  const format = useNumberFormat();
  const currencySymbol = selectedCurrency === "USD" ? "$" : "Bs";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Hero Card: Patrimonio Neto */}
      <Card className="rounded-2xl border-purple-500/50 bg-gradient-to-br from-purple-900/40 via-purple-950/30 to-card shadow-md relative overflow-hidden">
        <CardContent className="p-5 flex flex-col justify-between gap-4 h-full relative z-10">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200">
              <span>Patrimonio Neto</span>
              <Info className="w-3.5 h-3.5 text-purple-300/70" />
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col min-w-0">
            <span className="text-xl sm:text-2xl lg:text-[28px] font-black text-white tracking-tight tabular-nums truncate">
              {currencySymbol} {format(kpis.netWorth)}
            </span>
          </div>

          {/* Footer Badge & Comparison */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-extrabold text-[11px]">
              <ArrowUp className="w-3 h-3 stroke-[2.5]" />
              <span>+{kpis.netWorthGrowthPct.toFixed(1)}%</span>
            </div>
            <span className="text-purple-200/70 text-[11px] font-medium">vs. mes anterior</span>
          </div>
        </CardContent>

        {/* Decorative Wave Graphic Background */}
        <div className="absolute right-0 bottom-0 w-36 h-20 opacity-30 pointer-events-none">
          <svg viewBox="0 0 144 80" fill="none" className="w-full h-full">
            <path
              d="M0 60 Q 36 20, 72 45 T 144 15 L 144 80 L 0 80 Z"
              fill="url(#purpleWaveGradient)"
            />
            <path
              d="M0 60 Q 36 20, 72 45 T 144 15"
              stroke="#a855f7"
              strokeWidth="2.5"
              fill="none"
            />
            <defs>
              <linearGradient id="purpleWaveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </Card>

      {/* 2. Activos */}
      <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs hover:border-border transition-colors">
        <CardContent className="p-5 flex flex-col justify-between gap-4 h-full">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Activos</span>
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-lg sm:text-xl lg:text-2xl font-extrabold text-foreground tracking-tight tabular-nums truncate">
              {currencySymbol} {format(kpis.totalAssets)}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
            <ArrowUp className="w-3 h-3 stroke-[2.5]" />
            <span>+{kpis.assetsGrowthPct.toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Pasivos */}
      <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs hover:border-border transition-colors">
        <CardContent className="p-5 flex flex-col justify-between gap-4 h-full">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Pasivos</span>
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-lg sm:text-xl lg:text-2xl font-extrabold text-foreground tracking-tight tabular-nums truncate">
              {currencySymbol} {format(kpis.totalLiabilities)}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400">
            <ArrowDown className="w-3 h-3 stroke-[2.5]" />
            <span>{kpis.liabilitiesGrowthPct.toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Saldo total en cuentas */}
      <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs hover:border-border transition-colors">
        <CardContent className="p-5 flex flex-col justify-between gap-4 h-full">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Saldo total en cuentas</span>
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-lg sm:text-xl lg:text-2xl font-extrabold text-foreground tracking-tight tabular-nums truncate">
              {currencySymbol} {format(kpis.totalLiquidBalance)}
            </span>
          </div>

          <span className="text-[11px] text-muted-foreground font-medium truncate">
            Disponible en bancos y wallets
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
