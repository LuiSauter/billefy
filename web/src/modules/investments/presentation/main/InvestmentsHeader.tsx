"use client";

import React, { useState } from "react";
import { Plus, Calendar, ChevronDown, ArrowDownUp, RefreshCw } from "lucide-react";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentPeriodLabel =
    PERIOD_OPTIONS.find((p) => p.value === selectedPeriod)?.label || "Últimos 6 meses";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Inversiones
        </h1>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
          Gestiona tu portafolio, sigue su rendimiento y evalúa el crecimiento de tu dinero.
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Period Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-10 px-3.5 rounded-xl border border-border/80 bg-card/80 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{currentPeriodLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-card border border-border shadow-xl z-30 py-1.5 animate-in fade-in zoom-in-95 duration-100">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onPeriodChange(opt.value);
                    setDropdownOpen(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs transition cursor-pointer ${
                    selectedPeriod === opt.value
                      ? "bg-purple-600/15 text-purple-300 font-bold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sync with Binance Button */}
        {onSyncBinance && (
          <button
            type="button"
            onClick={onSyncBinance}
            disabled={isSyncingBinance}
            className="h-10 px-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs disabled:opacity-50"
            title="Sincronizar balances Spot desde Binance"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBinance ? "animate-spin" : ""}`} />
            <span>{isSyncingBinance ? "Sincronizando..." : "Sincronizar Binance"}</span>
          </button>
        )}

        {/* Live Crypto Prices Refresh Button */}
        {onSyncLivePrices && (
          <button
            type="button"
            onClick={onSyncLivePrices}
            disabled={isSyncingLivePrices}
            className="h-10 px-3.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs disabled:opacity-50"
            title="Actualizar cotizaciones en vivo (Binance y Yahoo Finance)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLivePrices ? "animate-spin" : ""}`} />
            <span>{isSyncingLivePrices ? "Actualizando precios..." : "Actualizar cotizaciones"}</span>
          </button>
        )}

        {/* Secondary Cash button (Aporte / Retiro) */}
        <button
          type="button"
          onClick={onOpenCashModal}
          className="h-10 px-3.5 rounded-xl border border-border/80 bg-card/80 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
        >
          <ArrowDownUp className="w-3.5 h-3.5 text-purple-400" />
          <span>Aporte o retiro</span>
        </button>

        {/* Primary "+ Registrar inversión" Button */}
        <button
          type="button"
          onClick={onOpenCreateInvestment}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/25 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Registrar inversión</span>
        </button>
      </div>
    </div>
  );
}
