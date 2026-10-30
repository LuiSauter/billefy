"use client";

import { PieChart, Plus } from "lucide-react";
import {
  BudgetDto,
  getBudgetCategoryEmoji,
} from "@/modules/planning/domain/planning.types";
import {
  BudgetMetrics,
  getRemainingDaysInMonth,
} from "@/modules/planning/domain/budget-calculator";

interface MonthlyBudgetViewProps {
  budgets: BudgetDto[];
  metrics: BudgetMetrics;
  onOpenCreateBudgetModal: () => void;
}

export function MonthlyBudgetView({
  budgets,
  metrics,
  onOpenCreateBudgetModal,
}: MonthlyBudgetViewProps) {
  const getStatusBadge = (percentage: number) => {
    if (percentage >= 100) {
      return <span className="text-xs font-bold text-rose-400">Tope Alcanzado</span>;
    }
    if (percentage >= 80) {
      return <span className="text-xs font-bold text-amber-400">Alerta 80% ⚠️</span>;
    }
    return <span className="text-xs font-bold text-primary">Normal</span>;
  };

  const getProgressBg = (percentage: number) => {
    if (percentage >= 100) return "bg-rose-500";
    if (percentage >= 80) return "bg-amber-500";
    return "bg-primary";
  };

  const now = new Date();
  const currentMonthLabel =
    now.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).charAt(0).toUpperCase() +
    now.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).slice(1);

  const daysRemainingInMonth = getRemainingDaysInMonth(now);

  return (
    <div className="w-full max-w-[1100px] p-[28px_32px_40px_32px] rounded-[20px] bg-card border border-border shadow-xs flex flex-col gap-[22px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-[40px] h-[40px] rounded-[10px] bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0">
            <PieChart className="w-[18px] h-[18px]" />
          </div>
          <div>
            <h1 className="text-[18px] font-black text-foreground tracking-tight">
              Presupuestos Mensuales & Límites de Gasto
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-0.5">
              Límites por categoría con alertas al 80% y 100% en moneda boliviana
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="h-[38px] px-3.5 rounded-[10px] border border-border bg-secondary text-sm font-bold text-foreground flex items-center select-none shadow-2xs">
            {currentMonthLabel}
          </div>
          <button
            onClick={onOpenCreateBudgetModal}
            className="h-[38px] px-4 rounded-[10px] bg-primary hover:bg-blue-600 active:scale-[0.99] text-white text-sm font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Presupuesto</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-[14px] bg-background border border-border flex flex-col gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Tope Total del Mes</span>
            <span className="text-xs font-extrabold text-primary">Asignado</span>
          </div>
          <div className="text-[22px] font-black text-foreground font-mono">
            Bs. {metrics.totalLimitBob}
          </div>
          <p className="text-xs font-medium text-muted-foreground">Límite asignado</p>
        </div>

        <div className="p-4 rounded-[14px] bg-background border border-border flex flex-col gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Gastado este Mes</span>
            <span
              className={`text-xs font-extrabold ${
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
                ? "Alerta 80%"
                : "Normal"}
            </span>
          </div>
          <div className="text-[22px] font-black text-foreground font-mono">
            Bs. {metrics.totalSpentBob}
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {metrics.spentRatioPercentage.toFixed(1)}% del tope
          </p>
        </div>

        <div className="p-4 rounded-[14px] bg-background border border-border flex flex-col gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Ritmo Seguro Diario</span>
            <span className="text-xs font-extrabold text-emerald-400">Ritmo Seguro</span>
          </div>
          <div className="text-[22px] font-black text-foreground font-mono">
            Bs. {metrics.safeDailyRhythmBob} / día
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {daysRemainingInMonth} días restantes en el mes
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[15px] font-extrabold text-foreground">
          Límites Activos por Categoría
        </h2>

        <div className="overflow-x-auto">
          <div className="min-w-[620px] flex flex-col">
            <div className="grid grid-cols-12 gap-2 px-2 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
              <div className="col-span-3">Categoría</div>
              <div className="col-span-3">Consumido / Tope</div>
              <div className="col-span-3">Barra de Consumo</div>
              <div className="col-span-2 text-center">Estado / Alerta</div>
              <div className="col-span-1 text-right">Disponible</div>
            </div>

            <div className="flex flex-col divide-y divide-border">
              {budgets.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No tienes presupuestos activos. Creá uno con &quot;+ Crear Presupuesto&quot;.
                </div>
              ) : (
                budgets.map((b) => {
                  const spent = b.spentAmount;
                  const limit = b.limitAmount;
                  const available = Math.max(0, limit - spent);
                  const percentage = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
                  const categoryName = b.categoryId || "Gastos Generales";
                  const emoji = getBudgetCategoryEmoji(categoryName);

                  return (
                    <div
                      key={b.id}
                      className="grid grid-cols-12 gap-2 px-2 py-3.5 items-center hover:bg-muted/40 transition"
                    >
                      <div className="col-span-3 flex items-center gap-1.5 text-sm font-bold text-foreground truncate">
                        <span>{emoji}</span>
                        <span className="truncate">{categoryName}</span>
                      </div>

                      <div className="col-span-3 text-sm font-extrabold text-foreground font-mono">
                        Bs {spent.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                        <span className="text-muted-foreground font-semibold">
                          / Bs {limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="col-span-3 flex items-center gap-2">
                        <div className="flex-1 h-[6px] rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${getProgressBg(percentage)} transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground w-8 text-right font-mono">
                          {percentage}%
                        </span>
                      </div>

                      <div className="col-span-2 text-center">{getStatusBadge(percentage)}</div>

                      <div className="col-span-1 text-right text-sm font-bold text-emerald-400 font-mono">
                        Bs {available.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
