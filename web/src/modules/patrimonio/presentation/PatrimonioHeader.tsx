"use client";

import React, { useState, useMemo } from "react";
import { Plus, Calendar, ChevronDown, Landmark } from "lucide-react";
import { Amount } from "@/shared/ui/amount";

interface PatrimonioHeaderProps {
  onOpenAddAsset: () => void;
  onOpenAddLiability: () => void;
  selectedCurrency?: "BOB" | "USD";
  onToggleCurrency?: () => void;
  p2pRate?: number;
}

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function PatrimonioHeader({
  onOpenAddAsset,
  onOpenAddLiability,
  selectedCurrency = "BOB",
  onToggleCurrency,
  p2pRate = 9.85,
}: PatrimonioHeaderProps) {
  const monthChoices = useMemo(() => {
    const choices: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      choices.push(`${MONTH_NAMES_ES[d.getMonth()]} ${d.getFullYear()}`);
    }
    choices.push("Este año");
    return choices;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(() => monthChoices[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Patrimonio
        </h1>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
          Conoce el valor total de tus activos, pasivos y tu patrimonio neto.
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Month Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-10 px-3.5 rounded-xl border border-border/80 bg-card/80 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{selectedMonth}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-card border border-border shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
              {monthChoices.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(m);
                    setDropdownOpen(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs transition cursor-pointer ${
                    selectedMonth === m
                      ? "bg-purple-600/15 text-purple-300 font-bold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Currency Switcher & P2P Badge */}
        {onToggleCurrency && (
          <button
            type="button"
            onClick={onToggleCurrency}
            aria-label="Alternar moneda (BOB / USD)"
            className="h-10 px-3.5 rounded-xl border border-border/80 bg-card/80 hover:bg-muted text-foreground text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs"
          >
            <span className="text-purple-400 font-extrabold">
              {selectedCurrency === "BOB" ? "BOB (Bs.)" : "USD ($)"}
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              P2P <Amount value={p2pRate} currency="BOB" size="inherit" tone="inherit" />
            </span>
            <span className="text-xs text-muted-foreground">▼</span>
          </button>
        )}

        {/* Secondary Button: Registrar pasivo */}
        <button
          type="button"
          onClick={onOpenAddLiability}
          className="h-10 px-3.5 rounded-xl border border-border/80 bg-card/80 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
        >
          <Landmark className="w-3.5 h-3.5 text-rose-400" />
          <span>+ Pasivo</span>
        </button>

        {/* Primary Button: + Agregar activo */}
        <button
          type="button"
          onClick={onOpenAddAsset}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/25 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Agregar activo</span>
        </button>
      </div>
    </div>
  );
}
