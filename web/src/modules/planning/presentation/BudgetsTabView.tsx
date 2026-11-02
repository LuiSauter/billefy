"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Calendar, Plus } from "lucide-react";
import { BudgetDto, GoalDto, FinancialHealthDto } from "@/modules/planning/domain/planning.types";
import { BudgetMetrics } from "@/modules/dashboard/application/useFinancialMetrics";
import { DistributionPlan, PlanBucket } from "@/modules/planning/domain/distribution-plan";
import { DistributionPlanController } from "@/modules/planning/application/useDistributionPlan";
import type { PlanLoadStatus } from "../application/distribution-plan-load";
import { EditBudgetModal, EditBudgetModalProps } from "./EditBudgetModal";
import { HealthIndicatorsCard } from "@/modules/planning/presentation/HealthIndicatorsCard";
import { notify } from "@/shared/lib/notify";
import { TransactionDto } from "@/modules/ledger/domain/ledger.types";
import {
  getAvailableMonths,
  monthKey,
  monthLabel,
  sumMonthlyFlow,
} from "@/modules/ledger/domain/monthly-analytics";
import { formatNumber } from "@/shared/lib/number-format";
import { Button } from "@/shared/ui/button";

// New Redesign Presentation Components
import { BudgetKpiCards } from "./BudgetKpiCards";
import { BudgetDistributionCard } from "./BudgetDistributionCard";
import { CategoryExpensesCard } from "./CategoryExpensesCard";
import { BudgetProgressCard } from "./BudgetProgressCard";
import { MonthProjectionChart } from "./MonthProjectionChart";
import { BudgetInsightsCard } from "./BudgetInsightsCard";
import { AdjustRuleModal } from "./AdjustRuleModal";

export type BudgetsLoadState = "loading" | "error" | "stale" | "refreshing" | "ready";

export function resolveBudgetsLoadState(
  count: number,
  loading: boolean,
  error: Error | null
): BudgetsLoadState {
  if (count === 0) {
    if (loading) return "loading";
    if (error) return "error";
    return "ready";
  }
  if (error) return "stale";
  if (loading) return "refreshing";
  return "ready";
}

const retryButtonClass =
  "h-[34px] px-3 rounded-[10px] border border-border bg-card hover:bg-muted text-sm font-semibold transition shrink-0";

export function BudgetsLoadStatus({
  state,
  onRetry,
}: {
  state: BudgetsLoadState;
  onRetry: () => void;
}) {
  if (state === "ready") return null;
  if (state === "loading") {
    return (
      <div
        role="status"
        className="rounded-[16px] border border-border bg-card p-6 text-sm text-muted-foreground animate-pulse"
      >
        Cargando presupuestos…
      </div>
    );
  }
  if (state === "refreshing") {
    return (
      <p role="status" className="text-xs text-muted-foreground">
        Actualizando presupuestos…
      </p>
    );
  }
  return (
    <div
      role="alert"
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[16px] border border-rose-500/40 bg-rose-500/10 p-4 text-sm"
    >
      <span>
        {state === "error"
          ? "No se pudieron cargar los presupuestos. Revisá tu conexión e intentá de nuevo."
          : "No se pudo actualizar la lista. Los datos mostrados pueden estar desactualizados."}
      </span>
      <button type="button" onClick={onRetry} className={retryButtonClass}>
        Reintentar
      </button>
    </div>
  );
}

export interface BudgetsTabViewProps {
  plan?: DistributionPlan;
  planStatus?: PlanLoadStatus;
  onRetryPlan?: () => void;
  planController?: DistributionPlanController;
  onSavePlanBuckets?: (buckets: PlanBucket[]) => void;
  budgets: BudgetDto[];
  budgetsLoading?: boolean;
  budgetsError?: Error | null;
  onRetryBudgets?: () => void;
  goals?: GoalDto[];
  goalsLoading?: boolean;
  overviewLoading?: boolean;
  overviewError?: Error | null;
  health?: FinancialHealthDto | null;
  budgetMetrics?: BudgetMetrics;
  transactions?: TransactionDto[];
  p2pRate?: number;
  selectedCurrency?: "BOB" | "USD";
  onUpdateBudget: EditBudgetModalProps["onSubmit"];
  onOpenCreateBudgetModal: () => void;
  onOpenCreateGoalModal?: () => void;
  onOpenAccounts?: () => void;
  onRetryOverview?: () => void;
}

export function BudgetsTabView({
  plan,
  planStatus,
  onRetryPlan,
  planController,
  onSavePlanBuckets,
  budgets,
  budgetsLoading = false,
  budgetsError = null,
  onRetryBudgets = () => {},
  goals = [],
  goalsLoading = false,
  overviewLoading = false,
  overviewError = null,
  health = null,
  budgetMetrics,
  transactions = [],
  p2pRate = 9.85,
  selectedCurrency = "USD",
  onUpdateBudget,
  onOpenCreateBudgetModal,
  onOpenCreateGoalModal = () => {},
  onOpenAccounts = () => {},
  onRetryOverview = () => {},
}: BudgetsTabViewProps) {
  void planStatus;
  void onRetryPlan;
  void budgetMetrics;
  void goals;
  void goalsLoading;
  void onOpenCreateGoalModal;
  void onOpenAccounts;
  const [editingBudget, setEditingBudget] = useState<BudgetDto | null>(null);
  const [isAdjustRuleOpen, setIsAdjustRuleOpen] = useState(false);

  // Month selection (defaults to current month)
  const currentMonth = useMemo(() => monthKey(new Date()), []);
  const availableMonths = useMemo(
    () => getAvailableMonths(transactions),
    [transactions]
  );
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const loadState = resolveBudgetsLoadState(budgets.length, budgetsLoading, budgetsError);
  const hasBudgetData = loadState !== "loading" && loadState !== "error";

  // Currency Formatter
  const formatMoney = useCallback(
    (amount: number) => {
      const isUsd = selectedCurrency === "USD";
      const convention = isUsd ? "en-US" : "es-BO";
      const formatted = formatNumber(amount, convention, 2);
      return isUsd ? `$ ${formatted}` : `Bs. ${formatted}`;
    },
    [selectedCurrency]
  );

  // Financial calculations for the selected month
  const monthlyIncome = useMemo(() => {
    const raw = sumMonthlyFlow(transactions, selectedMonth, "Income", p2pRate).toNumber();
    if (selectedCurrency === "USD" && p2pRate > 0) {
      return raw / p2pRate;
    }
    return raw;
  }, [transactions, selectedMonth, p2pRate, selectedCurrency]);

  const monthlyExpenses = useMemo(() => {
    const raw = sumMonthlyFlow(transactions, selectedMonth, "Expense", p2pRate).toNumber();
    if (selectedCurrency === "USD" && p2pRate > 0) {
      return raw / p2pRate;
    }
    return raw;
  }, [transactions, selectedMonth, p2pRate, selectedCurrency]);

  // Total planned limit and spent from category budgets
  const { totalLimit, totalSpent } = useMemo(() => {
    let limit = 0;
    let spent = 0;
    for (const b of budgets) {
      limit += Number(b.limitAmount) || 0;
      spent += Number(b.spentAmount) || 0;
    }
    return { totalLimit: limit, totalSpent: spent };
  }, [budgets]);

  // Effective income for reference
  const effectiveIncome = monthlyIncome > 0 ? monthlyIncome : totalLimit;

  // Savings / Investment amount
  const savingsTargetAmount = useMemo(() => {
    const activePlan = planController?.plan || plan;
    const savingsBucket = activePlan?.buckets?.find(
      (b) =>
        b.trackingMode === "TargetOnly" ||
        b.name.toLowerCase().includes("ahorro") ||
        b.name.toLowerCase().includes("inversión")
    );
    const percent = savingsBucket ? savingsBucket.percent : 20;
    return (effectiveIncome * percent) / 100;
  }, [planController?.plan, plan, effectiveIncome]);

  // Available amount & percentage
  const { availableAmount, availablePercentage } = useMemo(() => {
    const baseBudget = totalLimit > 0 ? totalLimit : effectiveIncome;
    const spentAmount = totalSpent > 0 ? totalSpent : monthlyExpenses;
    const available = Math.max(0, baseBudget - spentAmount);
    const pct = baseBudget > 0 ? (available / baseBudget) * 100 : 0;
    return { availableAmount: available, availablePercentage: pct };
  }, [totalLimit, effectiveIncome, totalSpent, monthlyExpenses]);

  // Handle plan save from AdjustRuleModal
  const handleSaveBuckets = useCallback(
    (buckets: PlanBucket[]) => {
      if (planController) {
        planController.setBuckets(buckets);
        planController.setEnabled(true);
      } else if (onSavePlanBuckets) {
        onSavePlanBuckets(buckets);
      }
      notify.success("Regla de distribución actualizada", "Se aplicaron los nuevos porcentajes.");
    },
    [planController, onSavePlanBuckets]
  );

  const activePlan = planController?.plan || plan;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Presupuesto
          </h1>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
            Planifica, controla y optimiza tus ingresos y gastos mensuales.
          </p>
        </div>

        {/* Header Actions: Month selector + Create budget button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Month Selector */}
          <div className="relative inline-flex items-center">
            <select
              aria-label="Seleccionar mes"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-10 pl-9 pr-8 rounded-xl border border-border bg-card hover:bg-muted text-xs sm:text-sm font-bold text-foreground appearance-none cursor-pointer transition shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-card text-foreground">
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
            <span className="absolute right-3 text-muted-foreground pointer-events-none text-xs">
              ▾
            </span>
          </div>

          {/* Create budget CTA */}
          <Button
            type="button"
            onClick={onOpenCreateBudgetModal}
            className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm gap-2 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Crear presupuesto</span>
          </Button>
        </div>
      </div>

      {/* Loading & Stale Alerts */}
      <BudgetsLoadStatus state={loadState} onRetry={onRetryBudgets} />

      {hasBudgetData && (
        <>
          {/* 1. Top 4 KPI Cards */}
          <BudgetKpiCards
            monthlyIncome={effectiveIncome}
            monthlyExpenses={monthlyExpenses > 0 ? monthlyExpenses : totalSpent}
            savingsTargetAmount={savingsTargetAmount}
            availableAmount={availableAmount}
            availablePercentage={availablePercentage}
            formatMoney={formatMoney}
          />

          {/* 2. Main Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (7/12) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Card 1: Distribución del presupuesto */}
              <BudgetDistributionCard
                plan={activePlan}
                monthlyIncome={effectiveIncome}
                budgets={budgets}
                onOpenAdjustRule={() => setIsAdjustRuleOpen(true)}
                formatMoney={formatMoney}
              />

              {/* Card 2: Gastos por categoría */}
              <CategoryExpensesCard
                budgets={budgets}
                onOpenCreateBudgetModal={onOpenCreateBudgetModal}
                onEditBudget={setEditingBudget}
                formatMoney={formatMoney}
              />
            </div>

            {/* Right Column (5/12) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Card 1: Progreso del presupuesto */}
              <BudgetProgressCard
                totalSpent={totalSpent > 0 ? totalSpent : monthlyExpenses}
                totalLimit={totalLimit > 0 ? totalLimit : effectiveIncome}
                availableAmount={availableAmount}
                formatMoney={formatMoney}
              />

              {/* Card 2: Proyección del mes */}
              <MonthProjectionChart
                transactions={transactions}
                budgets={budgets}
                month={selectedMonth}
                p2pRate={p2pRate}
                totalLimit={totalLimit > 0 ? totalLimit : effectiveIncome}
                totalSpent={totalSpent > 0 ? totalSpent : monthlyExpenses}
                formatMoney={formatMoney}
              />

              {/* Card 3: Insights y recomendaciones */}
              <BudgetInsightsCard
                plan={activePlan}
                budgets={budgets}
                monthlyIncome={effectiveIncome}
                monthlyExpenses={monthlyExpenses > 0 ? monthlyExpenses : totalSpent}
                formatMoney={formatMoney}
              />
            </div>
          </div>
        </>
      )}

      {/* Edit Budget Modal */}
      {editingBudget && (
        <EditBudgetModal
          key={editingBudget.id}
          budget={editingBudget}
          onSubmit={onUpdateBudget}
          onClose={(result) => {
            setEditingBudget(null);
            if (result?.refresh.status === "failed") {
              notify.info(
                "Presupuesto guardado",
                "No se pudo recargar la lista. No hace falta volver a guardar."
              );
            }
          }}
        />
      )}

      {/* Adjust Distribution Rule Modal */}
      <AdjustRuleModal
        isOpen={isAdjustRuleOpen}
        onClose={() => setIsAdjustRuleOpen(false)}
        plan={activePlan}
        onSave={handleSaveBuckets}
      />

      {/* Connected Section: Salud Financiera */}
      <div className="flex flex-col gap-6 border-t border-border/60 pt-6">
        <HealthIndicatorsCard
          health={health}
          loading={overviewLoading}
          error={overviewError}
          onRetry={onRetryOverview}
        />
      </div>
    </div>
  );
}
