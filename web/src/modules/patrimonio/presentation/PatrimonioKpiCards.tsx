"use client";

import React from "react";
import { Info, TrendingUp, TrendingDown, Layers, CreditCard, Scale } from "lucide-react";
import { PatrimonioOverviewMetrics } from "../domain/patrimonio.types";
import { Amount, Percentage } from "@/shared/ui/amount";

interface PatrimonioKpiCardsProps {
  metrics: PatrimonioOverviewMetrics;
  currency?: string;
  targetCurrency?: "USD" | "BOB";
  p2pRate?: number;
}

export function PatrimonioKpiCards({
  metrics,
  currency = "USD",
  targetCurrency = "USD",
  p2pRate = 9.85,
}: PatrimonioKpiCardsProps) {
  const isBob = currency === "BOB" || targetCurrency === "BOB";
  const rate = p2pRate > 0 ? p2pRate : 9.85;
  const convertedEquivalent = isBob
    ? <Amount value={metrics.netWorth / rate} currency="USD" size="inherit" tone="inherit" />
    : <Amount value={metrics.netWorth * rate} currency="BOB" size="inherit" tone="inherit" />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3.5">
      {/* 1. Hero Card: Patrimonio Neto */}
      <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#26174d] via-[#1d123d] to-[#130d2a] border border-purple-500/30 p-5 relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[148px]">
        {/* Glow & Sparkline Background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/15 rounded-full blur-2xl pointer-events-none" />
        <svg
          className="absolute bottom-0 right-0 w-44 h-24 text-purple-400/25 pointer-events-none"
          viewBox="0 0 144 80"
          fill="none"
        >
          <path
            d="M0 65 C30 60, 50 40, 80 48 C110 55, 125 20, 144 12 L144 80 L0 80 Z"
            fill="currentColor"
            fillOpacity="0.3"
          />
          <path
            d="M0 65 C30 60, 50 40, 80 48 C110 55, 125 20, 144 12"
            stroke="#a855f7"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-purple-200">
              Patrimonio Neto
            </span>
            <div
              title="Activos totales menos pasivos totales (tu riqueza neta real)"
              className="cursor-help"
            >
              <Info className="w-3.5 h-3.5 text-purple-300/60 hover:text-purple-200 transition" />
            </div>
          </div>
        </div>

        <div className="my-2 relative z-10">
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            <Amount value={metrics.netWorth} currency={currency} size="inherit" tone="inherit" />
          </div>
          <div className="text-xs font-medium text-purple-200/80 mt-0.5">
            ≈ {convertedEquivalent} (P2P <Amount value={rate} currency="BOB" size="inherit" tone="inherit" />)
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
            <TrendingUp className="w-3 h-3 stroke-[2.5]" />
            <Percentage value={metrics.previousNetWorthChangePct ?? 0} sign="always" size="inherit" tone="inherit" />
          </span>
          <span className="text-[11px] font-medium text-purple-200/70">
            vs. mes anterior
          </span>
        </div>
      </div>

      {/* 2. Activos totales */}
      <div className="xl:col-span-3 rounded-2xl bg-card border border-border/80 p-5 flex flex-col justify-between shadow-2xs hover:border-purple-500/30 transition group min-h-[148px]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            Activos totales
          </span>
        </div>

        <div className="my-2">
          <div className="text-2xl font-black text-foreground tracking-tight">
            <Amount value={metrics.totalAssets} currency={currency} size="inherit" tone="inherit" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
          <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
          <span><Percentage value={metrics.assetsChangePct ?? 0} sign="always" size="inherit" tone="inherit" /></span>
        </div>
      </div>

      {/* 3. Pasivos totales */}
      <div className="xl:col-span-3 rounded-2xl bg-card border border-border/80 p-5 flex flex-col justify-between shadow-2xs hover:border-purple-500/30 transition group min-h-[148px]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/25">
            <CreditCard className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            Pasivos totales
          </span>
        </div>

        <div className="my-2">
          <div className="text-2xl font-black text-foreground tracking-tight">
            <Amount value={metrics.totalLiabilities} currency={currency} size="inherit" tone="inherit" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
          <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
          <span><Percentage value={metrics.liabilitiesChangePct ?? 0} sign="auto" size="inherit" tone="inherit" /></span>
        </div>
      </div>

      {/* 4. Ratio de endeudamiento */}
      <div className="xl:col-span-2 rounded-2xl bg-card border border-border/80 p-5 flex flex-col justify-between shadow-2xs hover:border-purple-500/30 transition group min-h-[148px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/25">
              <Scale className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground truncate">
              Ratio de endeudamiento
            </span>
          </div>
        </div>

        <div className="my-2 flex items-baseline justify-between gap-1">
          <span className="text-2xl font-black text-foreground tracking-tight">
            <Percentage value={metrics.debtRatioPct} sign="never" size="inherit" tone="inherit" />
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              metrics.debtHealth === "Saludable"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : metrics.debtHealth === "Moderado"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            }`}
          >
            {metrics.debtHealth}
          </span>
        </div>

        <div className="text-[11px] font-medium text-muted-foreground">
          Pasivos / Activos
        </div>
      </div>
    </div>
  );
}
