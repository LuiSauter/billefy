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
import { DashboardCard } from "./dashboard-card";
import { IconTile } from "./IconTile";
import { Amount } from "@/shared/ui/amount";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";
import type { DashboardHeroKpis } from "../../domain/dashboard-home-analytics";

interface DashboardHeroKpiCardsProps {
  kpis: DashboardHeroKpis;
  selectedCurrency: string;
}

export function DashboardHeroKpiCards({
  kpis,
  selectedCurrency,
}: DashboardHeroKpiCardsProps) {
  const numberPreferences = useNumberPreferences();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Hero Card: Patrimonio Neto. Deliberately a distinct visual tier (purple gradient, shadow-md, p-5), not the shared dashboard card variant. */}
      <Card className="rounded-2xl border-purple-500/50 bg-gradient-to-br from-purple-900/40 via-purple-950/30 to-card shadow-md relative overflow-hidden @container">
        <CardContent className="p-5 flex flex-col justify-between gap-4 h-full relative z-10 min-w-0">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-200">
              <span>Patrimonio Neto</span>
              <Info className="w-3.5 h-3.5 text-purple-300/70" />
            </div>
            <IconTile
              icon={Layers}
              variant="purple"
              size="sm"
              className="bg-purple-500/20 border-purple-500/40 text-purple-300"
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col min-w-0">
            <Amount value={kpis.netWorth} currency={selectedCurrency} size="xl" className="text-white sm:text-2xl xl:text-3xl min-w-0 truncate" />
          </div>

          {/* Footer Badge & Comparison */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-xs">
              <ArrowUp className="w-3 h-3 stroke-[2.5]" />
              <span>+{formatPercent(kpis.netWorthGrowthPct, numberPreferences)}</span>
            </div>
            <span className="text-purple-200/70 text-xs font-medium">vs. mes anterior</span>
          </div>
        </CardContent>

        {/* Decorative Wave Graphic Background */}
        <div className="absolute right-0 bottom-0 w-20 h-10 @xs:w-36 @xs:h-20 opacity-30 pointer-events-none">
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
      <DashboardCard className="hover:border-border transition-colors">
        <CardContent className="p-5 flex flex-col justify-between gap-4 h-full">
          <div className="flex items-center gap-2.5">
            <IconTile icon={Landmark} variant="emerald" />
            <span className="text-xs font-semibold text-muted-foreground">Activos</span>
          </div>

          <div className="flex flex-col min-w-0">
            <Amount value={kpis.totalAssets} currency={selectedCurrency} size="lg" className="min-w-0 truncate" />
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <ArrowUp className="w-3 h-3 stroke-[2.5]" />
            <span>+{formatPercent(kpis.assetsGrowthPct, numberPreferences)}</span>
          </div>
        </CardContent>
      </DashboardCard>

      {/* 3. Pasivos */}
      <DashboardCard className="hover:border-border transition-colors">
        <CardContent className="p-5 flex flex-col justify-between gap-4 h-full">
          <div className="flex items-center gap-2.5">
            <IconTile icon={CreditCard} variant="rose" />
            <span className="text-xs font-semibold text-muted-foreground">Pasivos</span>
          </div>

          <div className="flex flex-col min-w-0">
            <Amount value={kpis.totalLiabilities} currency={selectedCurrency} size="lg" className="min-w-0 truncate" />
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-rose-400">
            <ArrowDown className="w-3 h-3 stroke-[2.5]" />
            <span>{kpis.liabilitiesGrowthPct < 0 ? "-" : ""}{formatPercent(Math.abs(kpis.liabilitiesGrowthPct), numberPreferences)}</span>
          </div>
        </CardContent>
      </DashboardCard>

      {/* 4. Saldo total en cuentas */}
      <DashboardCard className="hover:border-border transition-colors">
        <CardContent className="p-5 flex flex-col justify-between gap-4 h-full">
          <div className="flex items-center gap-2.5">
            <IconTile icon={Wallet} variant="purple" />
            <span className="text-xs font-semibold text-muted-foreground">Saldo total en cuentas</span>
          </div>

          <div className="flex flex-col min-w-0">
            <Amount value={kpis.totalLiquidBalance} currency={selectedCurrency} size="lg" className="min-w-0 truncate" />
          </div>

          <span className="text-xs text-muted-foreground font-medium truncate">
            Disponible en bancos y wallets
          </span>
        </CardContent>
      </DashboardCard>
    </div>
  );
}
