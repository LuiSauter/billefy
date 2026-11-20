"use client";

import React from "react";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatAmountText, formatPercent } from "@/shared/lib/amount-format";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { buildBudgetPlanGuide, CurrencyCap } from "../domain/budget-plan-guide";
import { DistributionPlan } from "../domain/distribution-plan";
import { BudgetDto } from "../domain/planning.types";
import type { PlanLoadStatus } from "../application/distribution-plan-load";

interface DistributionPlanGuideProps {
  plan?: DistributionPlan;
  budgets: readonly BudgetDto[];
  /** Defaults to "loaded" so callers without load tracking keep the previous behavior. */
  planStatus?: PlanLoadStatus;
  onRetryPlan?: () => void;
}

function RetryButton({ onRetry }: { onRetry?: () => void }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="h-[34px] px-3 rounded-[10px] border border-border bg-card hover:bg-muted text-sm font-semibold transition shrink-0"
    >
      Reintentar
    </button>
  );
}

function PlanLoadAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm"
    >
      <span>{message}</span>
      <RetryButton onRetry={onRetry} />
    </div>
  );
}

function ConfiguredCaps({ caps }: { caps: CurrencyCap[] }) {
  const preferences = useNumberPreferences();
  return caps.length ? (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
      {caps.map((cap) => <li key={cap.currency}>{formatAmountText(cap.amount, cap.currency, preferences)}</li>)}
    </ul>
  ) : <p className="text-sm text-muted-foreground">Sin límites configurados.</p>;
}

export function DistributionPlanGuide({ plan, budgets, planStatus = "loaded", onRetryPlan }: DistributionPlanGuideProps) {
  const preferences = useNumberPreferences();
  const { categories } = useUserCategories();
  const guide = buildBudgetPlanGuide(plan, budgets, categories.filter((c) => c.direction === "Expense").map((c) => c.id));

  if (planStatus === "loading" || planStatus === "error") {
    return (
      <section aria-labelledby="budget-plan-guide" className="min-w-0 rounded-[20px] border border-border bg-card p-4 sm:p-6 space-y-4">
        <h2 id="budget-plan-guide" className="text-lg font-bold text-foreground">Tu plan como guía de presupuestos</h2>
        {planStatus === "loading" ? (
          <p role="status" className="text-sm text-muted-foreground animate-pulse">Cargando tu plan de distribución…</p>
        ) : (
          <PlanLoadAlert message="No se pudo cargar tu plan de distribución. Tus límites de gasto no se ven afectados." onRetry={onRetryPlan} />
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="budget-plan-guide" className="min-w-0 rounded-[20px] border border-border bg-card p-4 sm:p-6 space-y-4">
      <h2 id="budget-plan-guide" className="text-lg font-bold text-foreground">Tu plan como guía de presupuestos</h2>
      {planStatus === "stale" && (
        <PlanLoadAlert message="No se pudo actualizar tu plan; lo que ves puede estar desactualizado." onRetry={onRetryPlan} />
      )}
      {!guide ? (
        <p className="text-sm text-muted-foreground">
          No hay una guía de distribución configurada. Podés crear tu plan desde Configuración.
        </p>
      ) : (
        <>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Límites mensuales agrupados por categoría según tu plan de ingresos.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {guide.groups.map((group) => (
              <article key={group.id} className="min-w-0 rounded-xl border border-border bg-background p-3.5 sm:p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 font-bold text-foreground">
                  <h3 className="text-sm sm:text-base truncate min-w-0">{group.name}</h3>
                  <span className="text-primary text-sm sm:text-base shrink-0">{formatPercent(group.percent, preferences)}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span>{group.mode === "Expenses" ? "Gastos" : "Solo objetivo"}</span>
                </div>
                {group.mode === "Expenses" ? (
                  <div className="pt-1 border-t border-border/50">
                    <ConfiguredCaps caps={group.caps} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Referencia porcentual de ingresos</p>
                )}
              </article>
            ))}
          </div>
          {(guide.general.length > 0 || guide.unassigned.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border pt-3">
              {guide.general.length > 0 && (
                <div className="p-3 rounded-lg bg-background/50 border border-border/60 space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground">Límites generales</h4>
                  <ConfiguredCaps caps={guide.general} />
                </div>
              )}
              {guide.unassigned.length > 0 && (
                <div className="p-3 rounded-lg bg-background/50 border border-border/60 space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground">Categorías sin grupo</h4>
                  <ConfiguredCaps caps={guide.unassigned} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
