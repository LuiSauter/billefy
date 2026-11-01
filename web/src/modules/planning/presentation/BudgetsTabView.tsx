"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { BudgetDto, GoalDto, FinancialHealthDto } from "@/modules/planning/domain/planning.types";
import { BudgetMetrics } from "@/modules/dashboard/application/useFinancialMetrics";
import { MonthlyBudgetView } from "@/modules/planning/presentation/MonthlyBudgetView";
import { FinancialGoalsView } from "@/modules/planning/presentation/FinancialGoalsView";
import { HealthIndicatorsCard } from "@/modules/planning/presentation/HealthIndicatorsCard";
import { DistributionPlan } from "@/modules/planning/domain/distribution-plan";
import { DistributionPlanGuide } from "./DistributionPlanGuide";
import type { PlanLoadStatus } from "../application/distribution-plan-load";
import { EditBudgetModal, EditBudgetModalProps } from "./EditBudgetModal";
import { notify } from "@/shared/lib/notify";

const BudgetsComparisonChart = dynamic(() => import("@/modules/planning/presentation/BudgetsComparisonChart").then((m) => m.BudgetsComparisonChart), { ssr: false, loading: () => <div className="h-[240px] rounded-[16px] bg-card border border-border animate-pulse" /> });
export type BudgetsLoadState = "loading" | "error" | "stale" | "refreshing" | "ready";
export function resolveBudgetsLoadState(count: number, loading: boolean, error: Error | null): BudgetsLoadState {
  if (count === 0) { if (loading) return "loading"; if (error) return "error"; return "ready"; }
  if (error) return "stale"; if (loading) return "refreshing"; return "ready";
}
const retryButtonClass = "h-[34px] px-3 rounded-[10px] border border-border bg-card hover:bg-muted text-sm font-semibold transition shrink-0";
export function BudgetsLoadStatus({ state, onRetry }: { state: BudgetsLoadState; onRetry: () => void }) {
  if (state === "ready") return null;
  if (state === "loading") return <div role="status" className="rounded-[16px] border border-border bg-card p-6 text-sm text-muted-foreground animate-pulse">Cargando presupuestos…</div>;
  if (state === "refreshing") return <p role="status" className="text-xs text-muted-foreground">Actualizando presupuestos…</p>;
  return <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[16px] border border-rose-500/40 bg-rose-500/10 p-4 text-sm"><span>{state === "error" ? "No se pudieron cargar los presupuestos. Revisá tu conexión e intentá de nuevo." : "No se pudo actualizar la lista. Los datos mostrados pueden estar desactualizados."}</span><button type="button" onClick={onRetry} className={retryButtonClass}>Reintentar</button></div>;
}
interface BudgetsTabViewProps {
  plan?: DistributionPlan; planStatus?: PlanLoadStatus; onRetryPlan?: () => void;
  budgets: BudgetDto[]; budgetsLoading?: boolean; budgetsError?: Error | null; onRetryBudgets?: () => void;
  goals: GoalDto[]; goalsLoading?: boolean; overviewLoading?: boolean; overviewError?: Error | null;
  health: FinancialHealthDto | null; budgetMetrics: BudgetMetrics;
  onUpdateBudget: EditBudgetModalProps["onSubmit"];
  onOpenCreateBudgetModal: () => void; onOpenCreateGoalModal: () => void; onOpenAccounts: () => void; onRetryOverview?: () => void;
}
export function BudgetsTabView({ plan, planStatus, onRetryPlan, budgets, budgetsLoading = false, budgetsError = null, onRetryBudgets = () => {}, goals, goalsLoading = false, overviewLoading = false, overviewError = null, health, budgetMetrics, onUpdateBudget, onOpenCreateBudgetModal, onOpenCreateGoalModal, onOpenAccounts, onRetryOverview = () => {} }: BudgetsTabViewProps) {
  const [editingBudget, setEditingBudget] = useState<BudgetDto | null>(null);
  const loadState = resolveBudgetsLoadState(budgets.length, budgetsLoading, budgetsError);
  const hasBudgetData = loadState !== "loading" && loadState !== "error";
  return <div className="flex flex-col gap-6">
    <BudgetsLoadStatus state={loadState} onRetry={onRetryBudgets} />
    {hasBudgetData && <><DistributionPlanGuide plan={plan} budgets={budgets} planStatus={planStatus} onRetryPlan={onRetryPlan} /><BudgetsComparisonChart budgets={budgets} /><MonthlyBudgetView budgets={budgets} metrics={budgetMetrics} onOpenCreateBudgetModal={onOpenCreateBudgetModal} onEditBudget={setEditingBudget} /></>}
    {editingBudget && <EditBudgetModal key={editingBudget.id} budget={editingBudget} onSubmit={onUpdateBudget} onClose={(result) => { setEditingBudget(null); if (result?.refresh.status === "failed") notify.info("Presupuesto guardado", "No se pudo recargar la lista. No hace falta volver a guardar."); }} />}
    <FinancialGoalsView goals={goals} loading={goalsLoading || overviewLoading} error={overviewError} onRetry={onRetryOverview} onOpenCreateGoalModal={onOpenCreateGoalModal} onOpenAccounts={onOpenAccounts} />
    <HealthIndicatorsCard health={health} loading={overviewLoading} error={overviewError} onRetry={onRetryOverview} />
  </div>;
}
