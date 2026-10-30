"use client";

import React from "react";
import dynamic from "next/dynamic";
import { BudgetDto, GoalDto, FinancialHealthDto } from "@/modules/planning/domain/planning.types";
import { BudgetMetrics } from "@/modules/dashboard/application/useFinancialMetrics";
import { MonthlyBudgetView } from "@/modules/planning/presentation/MonthlyBudgetView";
import { FinancialGoalsView } from "@/modules/planning/presentation/FinancialGoalsView";
import { HealthIndicatorsCard } from "@/modules/planning/presentation/HealthIndicatorsCard";

const Split503020Chart = dynamic(
  () =>
    import("@/modules/planning/presentation/Split503020Chart").then(
      (m) => m.Split503020Chart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[240px] rounded-[16px] bg-card border border-border animate-pulse" />
    ),
  }
);

const BudgetsComparisonChart = dynamic(
  () =>
    import("@/modules/planning/presentation/BudgetsComparisonChart").then(
      (m) => m.BudgetsComparisonChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[240px] rounded-[16px] bg-card border border-border animate-pulse" />
    ),
  }
);

interface BudgetsTabViewProps {
  budgets: BudgetDto[];
  goals: GoalDto[];
  health: FinancialHealthDto | null;
  budgetMetrics: BudgetMetrics;
  totalSavedBob: string;
  p2pRate: number;
  onOpenCreateBudgetModal: () => void;
  onOpenCreateGoalModal: () => void;
  onOpenContributeModal: () => void;
}

export function BudgetsTabView({
  budgets,
  goals,
  health,
  budgetMetrics,
  totalSavedBob,
  p2pRate,
  onOpenCreateBudgetModal,
  onOpenCreateGoalModal,
  onOpenContributeModal,
}: BudgetsTabViewProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <BudgetsComparisonChart budgets={budgets} />
        <Split503020Chart health={health} />
      </div>

      <MonthlyBudgetView
        budgets={budgets}
        metrics={budgetMetrics}
        onOpenCreateBudgetModal={onOpenCreateBudgetModal}
      />

      <FinancialGoalsView
        goals={goals}
        health={health}
        totalSavedBob={totalSavedBob}
        onOpenCreateGoalModal={onOpenCreateGoalModal}
        onOpenContributeModal={onOpenContributeModal}
        p2pRate={p2pRate}
      />

      <HealthIndicatorsCard health={health} />
    </div>
  );
}
