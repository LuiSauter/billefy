"use client";

import React from "react";
import { Wallet } from "lucide-react";
import { Amount } from "@/shared/ui/amount";

interface PatrimonioCompositionBarProps {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetsPct: number;
  liabilitiesPct: number;
  currency?: string;
}

export function PatrimonioCompositionBar({
  totalAssets,
  totalLiabilities,
  netWorth,
  assetsPct,
  liabilitiesPct,
  currency = "USD",
}: PatrimonioCompositionBarProps) {
  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col gap-4">
      <h3 className="text-base font-bold text-foreground tracking-tight">
        Composición general
      </h3>

      {/* Two-tone Progress Bar */}
      <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex shadow-inner">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${assetsPct}%` }}
          title={`Activos: ${assetsPct}%`}
        />
        <div
          className="h-full bg-rose-500 transition-all duration-500"
          style={{ width: `${liabilitiesPct}%` }}
          title={`Pasivos: ${liabilitiesPct}%`}
        />
      </div>

      <div className="flex flex-col gap-2.5 text-xs">
        {/* Activos */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold text-muted-foreground">Activos</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-foreground">
              <Amount value={totalAssets} currency={currency} size="inherit" tone="inherit" />
            </span>
            <span className="font-mono text-muted-foreground font-semibold w-12 text-right">
              {assetsPct}%
            </span>
          </div>
        </div>

        {/* Pasivos */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <span className="font-semibold text-muted-foreground">Pasivos</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-foreground">
              <Amount value={totalLiabilities} currency={currency} size="inherit" tone="inherit" />
            </span>
            <span className="font-mono text-muted-foreground font-semibold w-12 text-right">
              {liabilitiesPct}%
            </span>
          </div>
        </div>

        {/* Highlight Box: Patrimonio neto */}
        <div className="mt-2 p-3 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-purple-200">Patrimonio neto</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-black text-white text-sm">
              <Amount value={netWorth} currency={currency} size="inherit" tone="inherit" />
            </span>
            <span className="font-mono text-purple-300 font-bold w-12 text-right">
              100%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
