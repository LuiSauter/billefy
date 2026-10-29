"use client";

import React from "react";
import { BudgetDto, GoalDto, FinancialHealthDto } from "@/domain/models/types";
import { BudgetMetrics } from "@/application/hooks/useFinancialMetrics";
import { MonthlyBudgetView } from "@/presentation/components/planning/MonthlyBudgetView";
import { FinancialGoalsView } from "@/presentation/components/planning/FinancialGoalsView";
import { HealthIndicatorsCard } from "@/presentation/components/dashboard/HealthIndicatorsCard";

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
