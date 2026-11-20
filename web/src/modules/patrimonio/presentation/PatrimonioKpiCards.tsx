"use client";

import React from "react";
import { Info, TrendingUp, TrendingDown, Minus, Layers, CreditCard, Scale } from "lucide-react";
import Decimal from "decimal.js";
import type { PatrimonioOverview } from "../domain/net-worth-analytics";
import { Amount, Percentage } from "@/shared/ui/amount";
import { CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { PatrimonioCard } from "./PatrimonioCard";
import { resolveTrend, type TrendTone } from "./patrimonio-trend";

interface PatrimonioKpiCardsProps {
  metrics: PatrimonioOverview;
  currency?: string;
  targetCurrency?: "USD" | "BOB";
  p2pRate?: number;
}

const TONE_CLASSNAMES: Record<TrendTone, { chip: string; plain: string }> = {
  good: { chip: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", plain: "text-emerald-400" },
  bad: { chip: "bg-rose-500/15 text-rose-400 border-rose-500/30", plain: "text-rose-400" },
  neutral: { chip: "bg-muted/60 text-muted-foreground border-border/60", plain: "text-muted-foreground" },
};

const TREND_ICONS = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

interface TrendIndicatorProps {
  pct: number | null;
  current: number;
  previous: number;
  /** Direction that benefits the user: "up" for assets/net worth, "down" for liabilities. */
  goodWhen: "up" | "down";
  currency: string;
  variant: "chip" | "plain";
}

/** Arrow + color follow the real sign of the change; with no percentage base it shows the absolute change instead. */
function TrendIndicator({ pct, current, previous, goodWhen, currency, variant }: TrendIndicatorProps) {
  const { direction, tone } = resolveTrend({ pct, current, previous, goodWhen });
  const Icon = TREND_ICONS[direction];
  const delta = new Decimal(current).minus(previous);

  return (
    <span
      data-trend={direction}
      data-tone={tone}
      className={cn(
        "inline-flex items-center gap-1 font-bold",
        variant === "chip" ? "px-2 py-0.5 rounded-full text-[11px] border" : "gap-1.5 text-xs",
        TONE_CLASSNAMES[tone][variant]
      )}
    >
      <Icon className={variant === "chip" ? "w-3 h-3 stroke-[2.5]" : "w-3.5 h-3.5 stroke-[2.5]"} aria-hidden="true" />
      {pct !== null ? (
        <Percentage value={pct} sign="always" size="inherit" tone="inherit" />
      ) : direction !== "flat" ? (
        <Amount value={delta} currency={currency} sign="always" size="inherit" tone="inherit" />
      ) : (
        <span>—</span>
      )}
    </span>
  );
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
    ? <Amount value={new Decimal(metrics.netWorth).div(rate)} currency="USD" size="inherit" tone="inherit" />
    : <Amount value={new Decimal(metrics.netWorth).times(rate)} currency="BOB" size="inherit" tone="inherit" />;

  return (
    <div className="@container">
      <div className="grid grid-cols-1 @md:grid-cols-2 @4xl:grid-cols-[1.3fr_1fr_1fr_1fr] gap-3.5">
        {/* 1. Hero Card: Patrimonio Neto */}
        <PatrimonioCard className="@container bg-gradient-to-br from-[#26174d] via-[#1d123d] to-[#130d2a] border-purple-500/30 relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[148px]">
          {/* Glow & Sparkline Background */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/15 rounded-full blur-2xl pointer-events-none" />
          <svg
            className="absolute bottom-0 right-0 w-44 h-24 text-purple-400/25 pointer-events-none"
            viewBox="0 0 144 80"
            fill="none"
            aria-hidden="true"
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

          <CardContent className="p-5 flex flex-1 flex-col justify-between relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-purple-200">Patrimonio Neto</span>
              <div title="Activos totales menos pasivos totales (tu riqueza neta real)" className="cursor-help">
                <Info className="w-3.5 h-3.5 text-purple-300/60 hover:text-purple-200 transition" aria-hidden="true" />
              </div>
            </div>

            <div className="my-2">
              <div className="text-2xl @sm:text-3xl font-black text-white tracking-tight">
                <Amount value={metrics.netWorth} currency={currency} size="inherit" tone="inherit" />
              </div>
              <div className="text-xs font-medium text-purple-200/80 mt-0.5">
                ≈ {convertedEquivalent} (P2P <Amount value={rate} currency="BOB" size="inherit" tone="inherit" />)
              </div>
            </div>

            <div className="flex items-center gap-2">
              <TrendIndicator
                pct={metrics.previousNetWorthChangePct}
                current={metrics.netWorth}
                previous={metrics.previousNetWorth}
                goodWhen="up"
                currency={currency}
                variant="chip"
              />
              <span className="text-[11px] font-medium text-purple-200/70">vs. mes anterior</span>
            </div>
          </CardContent>
        </PatrimonioCard>

        {/* 2. Activos totales */}
        <PatrimonioCard className="hover:border-purple-500/30 transition min-h-[148px]">
          <CardContent className="p-5 flex h-full flex-col justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                <Layers className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Activos totales</span>
            </div>

            <div className="my-2 text-2xl font-black text-foreground tracking-tight">
              <Amount value={metrics.totalAssets} currency={currency} size="inherit" tone="inherit" />
            </div>

            <TrendIndicator
              pct={metrics.assetsChangePct}
              current={metrics.totalAssets}
              previous={metrics.previousTotalAssets}
              goodWhen="up"
              currency={currency}
              variant="plain"
            />
          </CardContent>
        </PatrimonioCard>

        {/* 3. Pasivos totales */}
        <PatrimonioCard className="hover:border-purple-500/30 transition min-h-[148px]">
          <CardContent className="p-5 flex h-full flex-col justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/25">
                <CreditCard className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Pasivos totales</span>
            </div>

            <div className="my-2 text-2xl font-black text-foreground tracking-tight">
              <Amount value={metrics.totalLiabilities} currency={currency} size="inherit" tone="inherit" />
            </div>

            <TrendIndicator
              pct={metrics.liabilitiesChangePct}
              current={metrics.totalLiabilities}
              previous={metrics.previousTotalLiabilities}
              goodWhen="down"
              currency={currency}
              variant="plain"
            />
          </CardContent>
        </PatrimonioCard>

        {/* 4. Ratio de endeudamiento */}
        <PatrimonioCard className="hover:border-purple-500/30 transition min-h-[148px]">
          <CardContent className="p-5 flex h-full flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/25 shrink-0">
                <Scale className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground leading-tight">Ratio de endeudamiento</span>
            </div>

            <div className="my-2 flex flex-wrap items-baseline justify-between gap-1">
              <span className="text-2xl font-black text-foreground tracking-tight">
                <Percentage value={metrics.debtRatioPct} sign="never" size="inherit" tone="inherit" />
              </span>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border",
                  metrics.debtHealth === "Saludable"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : metrics.debtHealth === "Moderado"
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                )}
              >
                {metrics.debtHealth}
              </span>
            </div>

            <div className="text-[11px] font-medium text-muted-foreground">Pasivos / Activos</div>
          </CardContent>
        </PatrimonioCard>
      </div>
    </div>
  );
}
