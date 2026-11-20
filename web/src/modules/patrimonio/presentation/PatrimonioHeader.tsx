"use client";

import React, { useMemo } from "react";
import { Plus, Calendar, Landmark } from "lucide-react";
import { Amount } from "@/shared/ui/amount";
import { Button } from "@/shared/ui/button";
import { MONTH_NAMES } from "@/shared/ui/month-picker";

interface PatrimonioHeaderProps {
  onOpenAddAsset: () => void;
  onOpenAddLiability: () => void;
  selectedCurrency?: "BOB" | "USD";
  onToggleCurrency?: () => void;
  p2pRate?: number;
  /** Disables the add actions until manual data has hydrated (writes are ignored before that). */
  loading?: boolean;
}

export function PatrimonioHeader({
  onOpenAddAsset,
  onOpenAddLiability,
  selectedCurrency = "BOB",
  onToggleCurrency,
  p2pRate = 9.85,
  loading = false,
}: PatrimonioHeaderProps) {
  // Figures are always today's position (history lives in the evolution chart), so this is a label, not a selector.
  const asOfLabel = useMemo(() => {
    const now = new Date();
    return `${MONTH_NAMES[now.getMonth()].full} ${now.getFullYear()}`;
  }, []);

  return (
    <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Patrimonio
        </h1>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
          Conoce el valor total de tus activos, pasivos y tu patrimonio neto.
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <span
          title="Los valores corresponden a tu posición actual"
          className="h-10 px-3.5 rounded-xl border border-border/80 bg-card/60 text-muted-foreground text-xs font-semibold inline-flex items-center gap-2 shadow-2xs"
        >
          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{asOfLabel}</span>
        </span>

        {/* Currency Switcher & P2P Badge */}
        {onToggleCurrency && (
          <Button
            type="button"
            variant="outline"
            onClick={onToggleCurrency}
            aria-label="Alternar moneda (BOB / USD)"
            className="h-10 px-3.5 text-xs font-bold"
          >
            <span className="text-purple-400 font-extrabold">
              {selectedCurrency === "BOB" ? "BOB (Bs.)" : "USD ($)"}
            </span>
            <span className="text-[10px] text-muted-foreground hidden @md:inline">
              P2P <Amount value={p2pRate} currency="BOB" size="inherit" tone="inherit" />
            </span>
            <span className="text-xs text-muted-foreground" aria-hidden="true">▼</span>
          </Button>
        )}

        {/* Secondary Button: Registrar pasivo */}
        <Button type="button" variant="outline" disabled={loading} onClick={onOpenAddLiability} className="h-10 px-3.5 text-xs">
          <Landmark className="text-rose-400" aria-hidden="true" />
          <span>+ Pasivo</span>
        </Button>

        {/* Primary Button: + Agregar activo */}
        <Button
          type="button"
          disabled={loading}
          onClick={onOpenAddAsset}
          className="h-10 font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-600/25"
        >
          <Plus className="stroke-[2.5]" aria-hidden="true" />
          <span>Agregar activo</span>
        </Button>
      </div>
    </div>
  );
}
