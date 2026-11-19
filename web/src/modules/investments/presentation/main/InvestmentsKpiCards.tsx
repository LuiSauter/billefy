"use client";

import React from "react";
import { Info, TrendingUp, Layers, Percent } from "lucide-react";
import { PortfolioOverviewMetrics } from "../../domain/portfolio-analytics";
import { Amount, Percentage } from "@/shared/ui/amount";
import { Card } from "@/shared/ui/card";
import { InvestmentsCard } from "../InvestmentsCard";

interface InvestmentsKpiCardsProps {
  metrics: PortfolioOverviewMetrics;
  currency?: string;
}

export function InvestmentsKpiCards({
  metrics,
  currency = "USD",
}: InvestmentsKpiCardsProps) {
  const isPositiveGain = metrics.totalGainLoss >= 0;

  return (
    // Spans follow the width of the page area (it shares the viewport with the sidebar), not the viewport.
    <div className="@container">
      <div className="grid grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-12 gap-3.5">
        {/* 1. Hero Card: Valor de inversiones */}
        <Card className="@md:col-span-2 @2xl:col-span-12 @6xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#26174d] via-[#1d123d] to-[#130d2a] border-purple-500/30 p-5 relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[148px]">
          {/* Glow & Sparkline Background */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/15 rounded-full blur-2xl pointer-events-none" />
          <svg
            className="absolute bottom-0 right-0 w-44 h-24 text-purple-400/25 pointer-events-none"
            viewBox="0 0 144 80"
            fill="none"
          >
            <path
              d="M0 65 C35 60, 50 35, 80 42 C110 50, 120 18, 144 10 L144 80 L0 80 Z"
              fill="currentColor"
              fillOpacity="0.3"
            />
            <path
              d="M0 65 C35 60, 50 35, 80 42 C110 50, 120 18, 144 10"
              stroke="#a855f7"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-purple-200">
                Valor de inversiones
              </span>
              <div
                title="Valuación total del portafolio consolidado"
                className="cursor-help"
              >
                <Info className="w-3.5 h-3.5 text-purple-300/60 hover:text-purple-200 transition" />
              </div>
            </div>
          </div>

          <div className="my-2 relative z-10">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              <Amount value={metrics.totalValue} currency={currency} size="inherit" tone="inherit" />
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                metrics.previousPeriodChangePct !== null && metrics.previousPeriodChangePct >= 0
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
              }`}
            >
              <TrendingUp className="w-3 h-3 stroke-[2.5]" />
              {metrics.previousPeriodChangePct !== null
                ? <Percentage value={metrics.previousPeriodChangePct} sign="always" size="inherit" tone="inherit" />
                : <Percentage value={0} sign="always" size="inherit" tone="inherit" />}
            </span>
            <span className="text-[11px] font-medium text-purple-200/70">
              vs. período anterior
            </span>
          </div>
        </Card>

        {/* 2. Ganancia / Pérdida */}
        <InvestmentsCard className="@2xl:col-span-4 @6xl:col-span-3 p-5 flex flex-col justify-between hover:border-purple-500/30 transition group min-h-[148px]">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                isPositiveGain
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/25"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              Ganancia / Pérdida
            </span>
          </div>

          <div className="my-2">
            <div
              className={`text-2xl font-black tracking-tight ${
                isPositiveGain ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {metrics.hasUnknownCost ? "No disponible" : <Amount value={metrics.totalGainLoss} sign="always" currency={currency} size="inherit" tone="inherit" />}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-bold ${
                isPositiveGain ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {metrics.hasUnknownCost ? "Costo histórico pendiente" : <Percentage value={metrics.totalGainLossPct} sign="always" size="inherit" tone="inherit" />}
            </span>
            <span className="text-[11px] text-muted-foreground">de rentabilidad</span>
          </div>
        </InvestmentsCard>

        {/* 3. Aporte total */}
        <InvestmentsCard className="@2xl:col-span-4 @6xl:col-span-3 p-5 flex flex-col justify-between hover:border-purple-500/30 transition group min-h-[148px]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/25">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              Aporte total
            </span>
          </div>

          <div className="my-2">
            <div className="text-2xl font-black text-foreground tracking-tight">
              {metrics.hasUnknownCost ? "Costo incompleto" : <Amount value={metrics.totalCost} currency={currency} size="inherit" tone="inherit" />}
            </div>
          </div>

          <div className="text-[11px] font-medium text-muted-foreground">
            Costo base de adquisición
          </div>
        </InvestmentsCard>

        {/* 4. Rendimiento anual (YTD) */}
        <InvestmentsCard className="@md:col-span-2 @2xl:col-span-4 @6xl:col-span-2 p-5 flex flex-col justify-between hover:border-purple-500/30 transition group min-h-[148px]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/25">
              <Percent className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground leading-tight">
              Rendimiento anual (YTD)
            </span>
          </div>

          <div className="my-2">
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              {metrics.hasUnknownCost ? "No disponible" : <Percentage value={metrics.annualReturnYtdPct} sign="always" size="inherit" tone="inherit" />}
            </div>
          </div>

          <div className="text-[11px] font-medium text-muted-foreground">
            Retorno estimado anual
          </div>
        </InvestmentsCard>
      </div>
    </div>
  );
}
