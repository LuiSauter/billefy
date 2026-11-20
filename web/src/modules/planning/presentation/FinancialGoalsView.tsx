"use client";

import React from "react";
import { Plus } from "lucide-react";
import { GoalDto } from "@/modules/planning/domain/planning.types";
import { buildGoalOverview } from "@/modules/planning/domain/goals-overview";
import { Amount } from "@/shared/ui/amount";
import { formatPercent } from "@/shared/lib/amount-format";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";

interface FinancialGoalsViewProps {
  goals: GoalDto[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onOpenCreateGoalModal: () => void;
  onOpenAccounts: () => void;
}
const retryClass = "min-h-11 rounded-lg border border-border px-4 font-semibold hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";
const statusCopy = { unlinked: "Sin cuenta vinculada", unavailable: "Cuenta no disponible", currency_mismatch: "Moneda distinta" } as const;

export function FinancialGoalsView({ goals, loading = false, error = null, onRetry = () => {}, onOpenCreateGoalModal, onOpenAccounts }: FinancialGoalsViewProps) {
  const preferences = useNumberPreferences();
  const hasData = goals.length > 0;
  return (
    <section aria-labelledby="goals-heading" className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6 flex flex-col gap-4">
      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><h2 id="goals-heading" className="text-lg font-extrabold">Tus metas</h2><p className="text-sm text-muted-foreground">El saldo completo de la cuenta vinculada cuenta para el avance.</p></div>
        <button type="button" onClick={onOpenCreateGoalModal} className="min-h-11 w-full sm:w-auto shrink-0 rounded-lg bg-primary px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><Plus aria-hidden="true" className="mr-1 inline h-4 w-4" />Nueva meta</button>
      </header>
      {loading && !hasData && <p role="status" className="text-sm text-muted-foreground">Cargando metas…</p>}
      {error && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span>{hasData ? "No se pudieron actualizar las metas. Los datos pueden estar desactualizados." : "No se pudieron cargar las metas."}</span><button type="button" onClick={onRetry} className={retryClass}>Reintentar</button></div>}
      {!loading && !error && goals.length === 0 && <div className="rounded-xl border border-border bg-background p-5 text-sm"><p className="font-semibold">Todavía no tienes metas.</p><p className="mt-1 text-muted-foreground">Crea una meta y, si quieres, vincúlala a una cuenta de la misma moneda.</p></div>}
      {hasData && <ul className="grid min-w-0 gap-3">
        {goals.map((goal) => {
          const view = buildGoalOverview(goal);
          return <li key={goal.id} className="min-w-0 rounded-xl border border-border bg-background p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0"><h3 className="break-words font-bold">{goal.name}</h3><p className="mt-1 break-words text-sm text-muted-foreground">Meta: <Amount value={goal.targetAmount} currency={goal.currency} size="sm" />{goal.targetDate ? ` · Fecha: ${goal.targetDate}` : ""}</p></div>
              <div className="min-w-0 text-left sm:text-right">{view.tracked ? <><p className="break-words text-sm">Actual: <Amount value={goal.currentAmount!} currency={goal.currency} size="sm" /></p><p className="break-words text-sm text-muted-foreground">Faltan: <Amount value={goal.remainingAmount!} currency={goal.currency} size="sm" /></p></> : <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{statusCopy[view.trackingStatus === "tracked" ? "unavailable" : view.trackingStatus]}</p>}</div>
            </div>
            {view.tracked ? <div className="mt-3 min-w-0">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs"><span>{formatPercent(view.percentage!, preferences)} completado</span>{view.monthly !== null && view.months !== null && view.months > 0 && <span className="break-words">En {view.months} {view.months === 1 ? "mes" : "meses"}: <Amount value={goal.monthlyContributionNeeded!} currency={goal.currency} size="xs" />/mes</span>}</div>
              <div role="progressbar" aria-label={`Avance de ${goal.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={view.percentage!} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${view.percentage}%` }} /></div>
              <p className="mt-2 break-words text-xs text-muted-foreground">Saldo de {view.accountName ?? "la cuenta vinculada"}{view.shared ? ` · Compartida con ${goal.sharedGoalCount} metas` : ""}</p>
            </div> : <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs text-muted-foreground">Vincula una cuenta para seguir el saldo real.</span><button type="button" onClick={onOpenAccounts} className="min-h-11 self-start rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Ver cuentas</button></div>}
          </li>;
        })}
      </ul>}
    </section>
  );
}
