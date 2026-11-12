"use client";

import React from "react";
import { Wallet, ArrowUpRight, Layers, Scale } from "lucide-react";
import { Amount } from "@/shared/ui/amount";
import { formatPercent } from "@/shared/lib/amount-format";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";

interface BudgetKpiCardsProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsTargetAmount: number;
  availableAmount: number;
  availablePercentage: number;
  currency: string;
}

export function BudgetKpiCards({
  monthlyIncome,
  monthlyExpenses,
  savingsTargetAmount,
  availableAmount,
  availablePercentage,
  currency,
}: BudgetKpiCardsProps) {
  const numberPreferences = useNumberPreferences();
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
          <Amount value={monthlyIncome} currency={currency} size="lg" className="min-w-0 truncate" />
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
          <Amount value={monthlyExpenses} currency={currency} size="lg" className="min-w-0 truncate" />
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
          <Amount value={savingsTargetAmount} currency={currency} size="lg" className="min-w-0 truncate" />
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
            <Amount value={availableAmount} currency={currency} size="lg" className="min-w-0 truncate" />
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shrink-0">
          {formatPercent(availablePercentage, numberPreferences)}
        </span>
      </div>
    </div>
  );
}
