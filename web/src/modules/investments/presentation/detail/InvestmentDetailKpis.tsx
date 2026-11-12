"use client";

import React from "react";
import { TrendingUp, Layers, ArrowUpRight, Percent } from "lucide-react";
import { InvestmentDetailMetrics } from "../../domain/investment-detail";
import { Amount } from "@/shared/ui/amount";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";

interface InvestmentDetailKpisProps {
  metrics: InvestmentDetailMetrics;
  currency?: string;
}

export function InvestmentDetailKpis({
  metrics,
  currency = "USD",
}: InvestmentDetailKpisProps) {
  const isPositiveGain = metrics.gainLoss >= 0;
  const preferences = useNumberPreferences();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Inversión total */}
      <div className="rounded-2xl bg-card border border-border/80 p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-semibold text-muted-foreground truncate">
            Inversión total
          </span>
          <Amount value={metrics.initialValue} currency={currency} size="lg" className="min-w-0 truncate" />
        </div>
      </div>

      {/* 2. Valor actual */}
      <div className="rounded-2xl bg-card border border-border/80 p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-semibold text-muted-foreground truncate">
            Valor actual
          </span>
          <Amount value={metrics.currentValue} currency={currency} size="lg" className="min-w-0 truncate" />
        </div>
      </div>

      {/* 3. Ganancia / Pérdida */}
      <div className="rounded-2xl bg-card border border-border/80 p-4 flex items-center gap-3.5 shadow-2xs">
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
            isPositiveGain
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/15 text-rose-400 border-rose-500/20"
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-semibold text-muted-foreground truncate">
            Ganancia / Pérdida
          </span>
          <Amount value={metrics.gainLoss} currency={currency} sign="always" tone={isPositiveGain ? "income" : "expense"} size="lg" className="min-w-0 truncate" />
        </div>
      </div>

      {/* 4. ROI */}
      <div className="rounded-2xl bg-card border border-border/80 p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
          <Percent className="w-4 h-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-semibold text-muted-foreground truncate">
            ROI
          </span>
          <span className="text-base sm:text-lg font-semibold text-emerald-400 truncate">
            +{formatPercent(metrics.roiPct, preferences)}
          </span>
        </div>
      </div>
    </div>
  );
}
