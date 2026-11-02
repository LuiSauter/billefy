"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

interface BudgetProgressCardProps {
  totalSpent: number;
  totalLimit: number;
  availableAmount: number;
  formatMoney: (amount: number) => string;
}

export function BudgetProgressCard({
  totalSpent,
  totalLimit,
  availableAmount,
  formatMoney,
}: BudgetProgressCardProps) {
  const percentage = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const isOver = percentage > 100;
  const isAlert = percentage >= 80 && percentage <= 100;
  const isGood = percentage < 80;

  const barWidth = Math.min(100, Math.max(0, percentage));

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-2xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
        <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
          Progreso del presupuesto
        </h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs sm:text-sm font-semibold text-muted-foreground">
            {formatMoney(totalSpent)} / {formatMoney(totalLimit)}
          </span>
          <span
            className={`font-mono text-xs sm:text-sm font-black ${
              isOver ? "text-rose-400" : isAlert ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {percentage}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 sm:h-3.5 rounded-full bg-muted/80 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOver
              ? "bg-rose-500"
              : isAlert
              ? "bg-amber-400"
              : "bg-gradient-to-r from-emerald-500 to-teal-400"
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Status Box */}
      {isGood && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs sm:text-sm font-bold text-foreground">
              Vas bien
            </span>
            <span className="text-xs text-muted-foreground">
              Has usado el {percentage}% de tu presupuesto mensual. Aún tienes{" "}
              <strong className="text-foreground font-mono">{formatMoney(availableAmount)}</strong>{" "}
              disponibles.
            </span>
          </div>
        </div>
      )}

      {isAlert && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs sm:text-sm font-bold text-foreground">
              Cuidado con el ritmo
            </span>
            <span className="text-xs text-muted-foreground">
              Has usado el {percentage}% de tu presupuesto. Te quedan{" "}
              <strong className="text-foreground font-mono">{formatMoney(availableAmount)}</strong>{" "}
              para el resto del mes.
            </span>
          </div>
        </div>
      )}

      {isOver && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs sm:text-sm font-bold text-foreground">
              Presupuesto excedido
            </span>
            <span className="text-xs text-muted-foreground">
              Has superado tu presupuesto mensual en{" "}
              <strong className="text-rose-400 font-mono">
                {formatMoney(totalSpent - totalLimit)}
              </strong>
              . Podés ajustar gastos no esenciales o reasignar límites.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
