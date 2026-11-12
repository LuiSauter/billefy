"use client";

import React from "react";
import { AlertTriangle, Pencil, PieChart, Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Amount } from "@/shared/ui/amount";
import { formatPercent } from "@/shared/lib/amount-format";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import {
  BudgetDto,
  getBudgetCategoryEmoji,
} from "@/modules/planning/domain/planning.types";
import {
  BudgetMetrics,
  BudgetRowViewModel,
  buildBudgetRows,
  getRemainingDaysInMonth,
} from "@/modules/planning/domain/budget-calculator";

interface MonthlyBudgetViewProps {
  budgets: BudgetDto[];
  metrics: BudgetMetrics;
  onOpenCreateBudgetModal: () => void;
  onEditBudget?: (budget: BudgetDto) => void;
}

export function MonthlyBudgetView({
  budgets,
  metrics,
  onOpenCreateBudgetModal,
  onEditBudget,
}: MonthlyBudgetViewProps) {
  const { findCategory } = useUserCategories();
  const numberPreferences = useNumberPreferences();
  const rows = buildBudgetRows(budgets);

  const exceededCount = rows.filter((r) => r.status === "exceeded").length;
  const alertCount = rows.filter((r) => r.status === "alert").length;

  const getStatusBadge = (row: BudgetRowViewModel) => {
    if (row.status === "exceeded") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Excedido
        </span>
      );
    }
    if (row.status === "alert") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
          Alerta al {row.thresholdLabel} ⚠️
        </span>
      );
    }
    return <span className="text-xs font-bold text-primary">Normal</span>;
  };

  const getProgressBg = (row: BudgetRowViewModel) => {
    if (row.status === "exceeded") return "bg-rose-500";
    if (row.status === "alert") return "bg-amber-500";
    return "bg-primary";
  };

  const now = new Date();
  const currentMonthLabel =
    now.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).charAt(0).toUpperCase() +
    now.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).slice(1);

  const daysRemainingInMonth = getRemainingDaysInMonth(now);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-[28px_32px_40px_32px] rounded-[20px] bg-card border border-border shadow-xs flex flex-col gap-5 sm:gap-[22px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-[40px] h-[40px] rounded-[10px] bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0">
            <PieChart className="w-[18px] h-[18px]" />
          </div>
          <div>
            <h1 className="text-base sm:text-[18px] font-black text-foreground tracking-tight">
              Presupuestos Mensuales
            </h1>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
              Límites de gasto con alertas automáticas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="h-[36px] sm:h-[38px] px-3 sm:px-3.5 rounded-[10px] border border-border bg-secondary text-xs sm:text-sm font-bold text-foreground flex items-center select-none shadow-2xs">
            {currentMonthLabel}
          </div>
          <button
            onClick={onOpenCreateBudgetModal}
            className="h-[36px] sm:h-[38px] px-3.5 sm:px-4 rounded-[10px] bg-primary hover:bg-blue-600 active:scale-[0.99] text-white text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Crear</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-[14px] bg-background border border-border flex flex-col gap-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-muted-foreground">Tope Total</span>
            <span className="text-[10px] sm:text-xs font-extrabold text-primary uppercase tracking-wide">Asignado</span>
          </div>
          <Amount value={metrics.totalLimitBob} currency="BOB" size="lg" />
        </div>

        <div className="p-3.5 sm:p-4 rounded-[14px] bg-background border border-border flex flex-col gap-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-muted-foreground">Gastado</span>
            <span
              className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wide ${
                metrics.spentRatioPercentage >= 100
                  ? "text-rose-400"
                  : metrics.spentRatioPercentage >= 80
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {metrics.spentRatioPercentage >= 100
                ? "Tope Alcanzado"
                : metrics.spentRatioPercentage >= 80
                ? "Alerta"
                : "Normal"}
            </span>
          </div>
          <Amount value={metrics.totalSpentBob} currency="BOB" size="lg" />
          <p className="text-[11px] text-muted-foreground">
            {formatPercent(metrics.spentRatioPercentage, numberPreferences)} del tope
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-[14px] bg-background border border-border flex flex-col gap-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-muted-foreground">Ritmo Diario</span>
            <span className="text-[10px] sm:text-xs font-extrabold text-emerald-400 uppercase tracking-wide">Seguro</span>
          </div>
          <Amount value={metrics.safeDailyRhythmBob} currency="BOB" size="lg" />
          <p className="text-[11px] text-muted-foreground">
            {daysRemainingInMonth} días restantes
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-[15px] font-extrabold text-foreground">
            Límites Activos por Categoría
          </h2>
          {(exceededCount > 0 || alertCount > 0) && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="text-muted-foreground">Prioridad de atención:</span>
              {exceededCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  {exceededCount} {exceededCount === 1 ? "excedido" : "excedidos"}
                </span>
              )}
              {alertCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  {alertCount} {alertCount === 1 ? "cerca del límite" : "cerca del límite"}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-background/50 overflow-hidden">
          {rows.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No tienes presupuestos activos. Creá uno con &quot;+ Crear Presupuesto&quot;.
            </div>
          ) : (
            rows.map((r) => {
              const b = r.budget;
              const categoryName = b.categoryId
                ? findCategory(b.categoryId)?.name || "Categoría no disponible"
                : "Gastos Generales";
              const emoji = getBudgetCategoryEmoji(categoryName);

              return (
                <div
                  key={b.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 hover:bg-muted/40 transition"
                >
                  {/* Category + Edit */}
                  <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0 sm:w-1/3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{emoji}</span>
                      <span className="text-sm font-bold text-foreground truncate">{categoryName}</span>
                      {onEditBudget && b.isActive && b.period.toLowerCase() === "monthly" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar presupuesto de ${categoryName} (${b.currency})`}
                          onClick={() => onEditBudget(b)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                    <div className="sm:hidden">{getStatusBadge(r)}</div>
                  </div>

                  {/* Progress bar + spent / limit */}
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-baseline gap-1 truncate">
                        <Amount value={b.spentAmount} currency={b.currency} size="sm" className="truncate" />
                        <span className="text-muted-foreground font-semibold shrink-0">/</span>
                        <Amount value={b.limitAmount} currency={b.currency} size="sm" className="text-muted-foreground truncate" />
                      </span>
                      <span className="font-bold text-muted-foreground shrink-0">{formatPercent(r.usedPercent, numberPreferences)}</span>
                    </div>
                    <div className="h-[6px] rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${getProgressBg(r)} transition-all duration-300`}
                        style={{ width: `${r.barPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Status (desktop) + Balance */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 sm:w-1/3 text-right">
                    <div className="hidden sm:block">{getStatusBadge(r)}</div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:mb-0.5">
                        {r.balanceLabel}
                      </span>
                      <Amount
                        value={r.balance.slice(b.currency.length).trim()}
                        currency={b.currency}
                        size="sm"
                        tone={r.balanceLabel === "Excedido" ? "expense" : "income"}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
