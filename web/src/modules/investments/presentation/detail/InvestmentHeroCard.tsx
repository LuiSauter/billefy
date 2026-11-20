"use client";

import React from "react";
import { Archive, MoreVertical, TrendingDown, TrendingUp } from "lucide-react";
import { Investment, getKindLabel } from "../../domain/investment.types";
import { InvestmentDetailMetrics } from "../../domain/investment-detail";
import { CategoryIconBadge } from "@/modules/ledger/presentation/CategoryIcon";
import { CategoryColorKey, CategoryIconKey } from "@/modules/ledger/domain/category.types";
import { Amount, Percentage, Quantity } from "@/shared/ui/amount";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { InvestmentsCard } from "../InvestmentsCard";

interface InvestmentHeroCardProps {
  investment: Investment;
  metrics: InvestmentDetailMetrics;
  currency?: string;
  /** Opens the archive confirmation. */
  onArchive?: () => void;
}

export function InvestmentHeroCard({
  investment,
  metrics,
  currency = "USD",
  onArchive,
}: InvestmentHeroCardProps) {
  const isPositiveGain = metrics.gainLoss >= 0;
  const recentChange = metrics.recentChangePct ?? 0;
  const RecentIcon = recentChange >= 0 ? TrendingUp : TrendingDown;
  const GainIcon = isPositiveGain ? TrendingUp : TrendingDown;

  // Distinctive crypto colors or category colors
  const isBtc = investment.name.toLowerCase().includes("btc") || investment.name.toLowerCase().includes("bitcoin");
  const isEth = investment.name.toLowerCase().includes("eth") || investment.name.toLowerCase().includes("ethereum");

  return (
    <InvestmentsCard className="@container relative overflow-hidden p-5">
      <div className="grid grid-cols-1 @4xl:grid-cols-12 gap-5 items-center">
        {/* Left: Asset Identity (Avatar, Name, Subtitle, Badges) */}
        <div className="@4xl:col-span-4 flex items-center justify-between gap-4 pr-0 @4xl:pr-4 @4xl:border-r @4xl:border-border/60 min-w-0">
          <div className="flex items-center gap-3.5 min-w-0">
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
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight truncate">
                  {investment.name}
                </h2>
                {investment.ticker && (
                  <Badge variant="investment" className="shrink-0 font-extrabold">
                    {investment.ticker}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground font-medium">{getKindLabel(investment.kind)}</span>
                <Badge variant="success" className="text-[10px] font-bold">Activa</Badge>
              </div>
            </div>
          </div>

          {onArchive && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Opciones de la inversión"
                    aria-label="Opciones de la inversión"
                  >
                    <MoreVertical aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem variant="destructive" onClick={onArchive}>
                  <Archive />
                  <span>Archivar inversión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right: 4 Metrics Columns (own container: the amounts need the width of this block, not of the card) */}
        <div className="@4xl:col-span-8 @container min-w-0">
          <div className="grid grid-cols-2 @2xl:grid-cols-4 gap-4">
            {/* 1. Valor actual */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground">Valor actual</span>
              <span className="text-xl @4xl:text-2xl font-black text-foreground tracking-tight">
                <Amount value={metrics.currentValue} currency={currency} size="inherit" tone="inherit" />
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <RecentIcon className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />
                <Percentage value={recentChange} sign="always" size="inherit" tone="auto" />
                <span className="text-muted-foreground font-medium">(24 h)</span>
              </div>
            </div>

            {/* 2. Ganancia / Pérdida */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground">Ganancia / Pérdida</span>
              <span className="text-xl @4xl:text-2xl font-black tracking-tight">
                {metrics.costBasis === null ? (
                  "No disponible"
                ) : (
                  <Amount value={metrics.gainLoss} sign="always" currency={currency} size="inherit" tone="auto" />
                )}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <GainIcon className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />
                {metrics.costBasis === null ? (
                  <span className="text-muted-foreground">Costo histórico pendiente</span>
                ) : (
                  <Percentage value={metrics.gainLossPct} sign="always" size="inherit" tone="auto" />
                )}
              </div>
            </div>

            {/* 3. Rentabilidad (ROI) */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground">Rentabilidad (ROI)</span>
              <span className="text-xl @4xl:text-2xl font-black tracking-tight">
                {metrics.costBasis === null ? (
                  "No disponible"
                ) : (
                  <Percentage value={metrics.roiPct} sign="always" size="inherit" tone="auto" />
                )}
              </span>
              <span className="text-[11px] text-muted-foreground">retorno total</span>
            </div>

            {/* 4. Cantidad & Costo promedio */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground">Cantidad</span>
              <span className="text-base @4xl:text-lg font-black text-foreground tracking-tight truncate">
                <Quantity value={metrics.quantity} size="inherit" /> {investment.currency}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                Costo prom:{" "}
                {metrics.costBasis === null ? (
                  "No disponible"
                ) : (
                  <Amount value={metrics.averageCost} currency={currency} size="inherit" tone="inherit" />
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </InvestmentsCard>
  );
}
