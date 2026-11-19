"use client";

import React from "react";
import { Plus, ArrowDownUp, RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { PeriodDropdown } from "../PeriodDropdown";

interface InvestmentsHeaderProps {
  onOpenCreateInvestment: () => void;
  onOpenCashModal: () => void;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  onSyncBinance?: () => void;
  isSyncingBinance?: boolean;
  onSyncLivePrices?: () => void;
  isSyncingLivePrices?: boolean;
}

const PERIOD_OPTIONS = [
  { value: "6m", label: "Últimos 6 meses" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "1y", label: "Último año" },
  { value: "all", label: "Todo el historial" },
];

export function InvestmentsHeader({
  onOpenCreateInvestment,
  onOpenCashModal,
  selectedPeriod,
  onPeriodChange,
  onSyncBinance,
  isSyncingBinance = false,
  onSyncLivePrices,
  isSyncingLivePrices = false,
}: InvestmentsHeaderProps) {
  return (
    <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Inversiones
        </h1>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
          Gestiona tu portafolio, sigue su rendimiento y evalúa el crecimiento de tu dinero.
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <PeriodDropdown options={PERIOD_OPTIONS} value={selectedPeriod} onChange={onPeriodChange} aria-label="Período del portafolio" />

        {/* Sync with Binance Button */}
        {onSyncBinance && (
          <Button
            type="button"
            variant="outline"
            onClick={onSyncBinance}
            disabled={isSyncingBinance}
            className="h-10 text-xs font-bold border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
            title="Sincronizar balances Spot desde Binance"
          >
            <RefreshCw className={cn(isSyncingBinance && "animate-spin")} aria-hidden="true" />
            <span>{isSyncingBinance ? "Sincronizando..." : "Sincronizar Binance"}</span>
          </Button>
        )}

        {/* Live Crypto Prices Refresh Button */}
        {onSyncLivePrices && (
          <Button
            type="button"
            variant="outline"
            onClick={onSyncLivePrices}
            disabled={isSyncingLivePrices}
            className="h-10 text-xs font-bold border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400"
            title="Actualizar cotizaciones en vivo (Binance y Yahoo Finance)"
          >
            <RefreshCw className={cn(isSyncingLivePrices && "animate-spin")} aria-hidden="true" />
            <span>{isSyncingLivePrices ? "Actualizando precios..." : "Actualizar cotizaciones"}</span>
          </Button>
        )}

        {/* Secondary Cash button (Aporte / Retiro) */}
        <Button type="button" variant="outline" onClick={onOpenCashModal} className="h-10 text-xs">
          <ArrowDownUp className="text-purple-400" aria-hidden="true" />
          <span>Aporte o retiro</span>
        </Button>

        {/* Primary "+ Registrar inversión" Button */}
        <Button
          type="button"
          onClick={onOpenCreateInvestment}
          className="h-10 font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-600/25"
        >
          <Plus className="stroke-[2.5]" aria-hidden="true" />
          <span>Registrar inversión</span>
        </Button>
      </div>
    </div>
  );
}
