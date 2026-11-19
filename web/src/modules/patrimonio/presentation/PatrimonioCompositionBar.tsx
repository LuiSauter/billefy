"use client";

import React from "react";
import { Wallet } from "lucide-react";
import { Amount, Percentage } from "@/shared/ui/amount";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { PatrimonioCard } from "./PatrimonioCard";

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
    <PatrimonioCard>
      <CardHeader className={appCardHeaderClassName}>
        <CardTitle className={appCardTitleClassName}>Composición general</CardTitle>
      </CardHeader>

      <CardContent className={`${appCardContentClassName} flex flex-col gap-4`}>
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
              <span className="font-bold text-foreground">
                <Amount value={totalAssets} currency={currency} size="inherit" tone="inherit" />
              </span>
              <span className="text-muted-foreground font-semibold min-w-14 text-right">
                <Percentage value={assetsPct} sign="never" size="inherit" tone="inherit" />
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
              <span className="font-bold text-foreground">
                <Amount value={totalLiabilities} currency={currency} size="inherit" tone="inherit" />
              </span>
              <span className="text-muted-foreground font-semibold min-w-14 text-right">
                <Percentage value={liabilitiesPct} sign="never" size="inherit" tone="inherit" />
              </span>
            </div>
          </div>

          {/* Highlight Box: Patrimonio neto */}
          <div className="mt-2 p-3 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" aria-hidden="true" />
              <span className="font-bold text-purple-200">Patrimonio neto</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-black text-white text-sm">
                <Amount value={netWorth} currency={currency} size="inherit" tone="inherit" />
              </span>
              <span className="text-purple-300 font-bold min-w-14 text-right">
                <Percentage value={100} sign="never" size="inherit" tone="inherit" />
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </PatrimonioCard>
  );
}
