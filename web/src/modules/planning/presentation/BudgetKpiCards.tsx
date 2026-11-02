"use client";

import React from "react";
import { Wallet, ArrowUpRight, Layers, Scale } from "lucide-react";

interface BudgetKpiCardsProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsTargetAmount: number;
  availableAmount: number;
  availablePercentage: number;
  formatMoney: (amount: number) => string;
}

export function BudgetKpiCards({
  monthlyIncome,
  monthlyExpenses,
  savingsTargetAmount,
  availableAmount,
  availablePercentage,
  formatMoney,
}: BudgetKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Ingreso mensual */}
      <div className="p-4 sm:p-4 rounded-2xl bg-card border border-border flex items-center gap-4 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <Wallet className="w-6 h-6" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-muted-foreground truncate">
            Ingreso mensual
          </span>
          <span className="text-md sm:text-lg font-black text-foreground font-mono truncate">
            {formatMoney(monthlyIncome)}
          </span>
        </div>
      </div>

      {/* 2. Gasto mensual */}
      <div className="p-4 sm:p-4 rounded-2xl bg-card border border-border flex items-center gap-4 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
          <ArrowUpRight className="w-6 h-6" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-muted-foreground truncate">
            Gasto mensual
          </span>
          <span className="text-md sm:text-lg font-black text-foreground font-mono truncate">
            {formatMoney(monthlyExpenses)}
          </span>
        </div>
      </div>

      {/* 3. Ahorro / Inversión */}
      <div className="p-4 sm:p-4 rounded-2xl bg-card border border-border flex items-center gap-4 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
          <Layers className="w-6 h-6" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-muted-foreground truncate">
            Ahorro / Inversión
          </span>
          <span className="text-md sm:text-lg font-black text-foreground font-mono truncate">
            {formatMoney(savingsTargetAmount)}
          </span>
        </div>
      </div>

      {/* 4. Disponible */}
      <div className="p-4 sm:p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-muted-foreground truncate">
              Disponible
            </span>
            <span className="text-md sm:text-lg font-black text-foreground font-mono truncate">
              {formatMoney(availableAmount)}
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shrink-0 font-mono">
          {availablePercentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
