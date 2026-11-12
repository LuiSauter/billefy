"use client";

import React from "react";
import { MoreVertical, TrendingUp } from "lucide-react";
import { Investment } from "../../domain/investment.types";
import { InvestmentDetailMetrics } from "../../domain/investment-detail";
import { CategoryIconBadge } from "@/modules/ledger/presentation/CategoryIcon";
import { CategoryColorKey, CategoryIconKey } from "@/modules/ledger/domain/category.types";
import { Amount, Percentage, Quantity } from "@/shared/ui/amount";

interface InvestmentHeroCardProps {
  investment: Investment;
  metrics: InvestmentDetailMetrics;
  currency?: string;
  onOpenEdit?: () => void;
}

export function InvestmentHeroCard({
  investment,
  metrics,
  currency = "$",
  onOpenEdit,
}: InvestmentHeroCardProps) {
  const isPositiveGain = metrics.gainLoss >= 0;

  // Distinctive crypto colors or category colors
  const isBtc = investment.name.toLowerCase().includes("btc") || investment.name.toLowerCase().includes("bitcoin");
  const isEth = investment.name.toLowerCase().includes("eth") || investment.name.toLowerCase().includes("ethereum");

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-sm relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: Asset Identity (Avatar, Name, Subtitle, Badges) */}
        <div className="lg:col-span-4 flex items-center justify-between gap-4 pr-0 lg:pr-4 lg:border-r lg:border-border/60">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Visual Icon */}
            {isBtc ? (
              <div className="w-14 h-14 rounded-2xl bg-[#f7931a] text-white flex items-center justify-center font-black text-2xl shadow-md border border-amber-400/40 shrink-0">
                ₿
              </div>
            ) : isEth ? (
              <div className="w-14 h-14 rounded-2xl bg-[#627eea] text-white flex items-center justify-center font-black text-xl shadow-md border border-indigo-400/40 shrink-0">
                Ξ
              </div>
            ) : (
              <div className="shrink-0">
                <CategoryIconBadge
                  iconKey={investment.iconKey as CategoryIconKey}
                  colorKey={investment.colorKey as CategoryColorKey}
                  size="lg"
                />
              </div>
            )}

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight truncate">
                  {investment.name}
                </h2>
                {investment.ticker && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">
                    {investment.ticker}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground font-medium">
                  {investment.kind === "crypto"
                    ? "Criptomoneda"
                    : investment.kind === "stocks"
                    ? "Acción de mercado"
                    : investment.kind === "funds"
                    ? "Fondo / ETF"
                    : investment.kind === "realestate"
                    ? "Bienes raíces"
                    : "Activo de inversión"}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Activa
                </span>
              </div>
            </div>
          </div>

          {onOpenEdit && (
            <button
              type="button"
              onClick={onOpenEdit}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition cursor-pointer"
              title="Opciones de la inversión"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right: 4 Metrics Columns */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* 1. Valor actual */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Valor actual</span>
            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              <Amount value={metrics.currentValue} currency={currency} size="inherit" tone="inherit" />
            </span>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
              <TrendingUp className="w-3 h-3 stroke-[2.5]" />
              <span>
                {metrics.recentChangePct !== null
                  ? <Percentage value={metrics.recentChangePct} sign="always" size="inherit" tone="inherit" />
                  : <Percentage value={0} sign="always" size="inherit" tone="inherit" />}{" "}(24 h)
              </span>
            </div>
          </div>

          {/* 2. Ganancia / Pérdida */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Ganancia / Pérdida</span>
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                isPositiveGain ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isPositiveGain ? "+ " : "- "}
              <Amount value={Math.abs(metrics.gainLoss)} currency={currency} size="inherit" tone="inherit" />
            </span>
            <div
              className={`flex items-center gap-1 text-[11px] font-bold ${
                isPositiveGain ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              <TrendingUp className="w-3 h-3 stroke-[2.5]" />
              <span>
                <Percentage value={metrics.gainLossPct} sign="always" size="inherit" tone="inherit" />
              </span>
            </div>
          </div>

          {/* 3. Rentabilidad (ROI) */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Rentabilidad (ROI)</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
              <Percentage value={metrics.roiPct} sign="always" size="inherit" tone="inherit" />
            </span>
            <span className="text-[11px] text-muted-foreground">retorno total</span>
          </div>

          {/* 4. Cantidad & Costo promedio */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Cantidad</span>
            <span className="text-base sm:text-lg font-black text-foreground tracking-tight truncate">
              <Quantity value={metrics.quantity} size="inherit" /> {investment.currency}
            </span>
            <span className="text-[11px] text-muted-foreground truncate">
              Costo prom: <Amount value={metrics.averageCost} currency={currency} size="inherit" tone="inherit" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
