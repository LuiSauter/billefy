"use client";

import { useState, useMemo, useCallback } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import {
  BudgetDto,
  CreateBudgetRequest,
  CreateGoalRequest,
  FinancialHealthDto,
  GoalDto,
  ProposeIncomeDistributionRequest,
} from "../domain/planning.types";
import { PlanningApiRepository } from "../infrastructure/planning-api.repository";

export function usePlanningModule(http: IHttpClient | null) {
  const [budgets, setBudgets] = useState<BudgetDto[]>([]);
  const [goals, setGoals] = useState<GoalDto[]>([]);
  const [health, setHealth] = useState<FinancialHealthDto | null>(null);

  const repo = useMemo(
    () => (http ? new PlanningApiRepository(http) : null),
    [http]
  );

  const refreshPlanning = useCallback(async () => {
    if (!repo) return;
    const [budgetsData, goalsData, healthData] = await Promise.all([
      repo.getBudgets().catch(() => []),
      repo.getGoals().catch(() => []),
      repo.getFinancialHealth().catch(() => null),
    ]);
    setBudgets(budgetsData);
    setGoals(goalsData);
    setHealth(healthData);
  }, [repo]);

  const createBudget = useCallback(
    async (req: CreateBudgetRequest) => {
      if (!repo) return;
      await repo.createBudget(req);
      await refreshPlanning();
    },
    [repo, refreshPlanning]
  );

  const createGoal = useCallback(
    async (req: CreateGoalRequest) => {
      if (!repo) return;
      await repo.createGoal(req);
      await refreshPlanning();
    },
    [repo, refreshPlanning]
  );

  const proposeIncomeDistribution = useCallback(
    async (req: ProposeIncomeDistributionRequest) => {
      if (!repo) throw new Error("Cliente no inicializado");
      return repo.proposeIncomeDistribution(req);
    },
    [repo]
  );

  return {
    budgets,
    setBudgets,
    goals,
    setGoals,
    health,
    setHealth,
    refreshPlanning,
    createBudget,
    createGoal,
    proposeIncomeDistribution,
  };
}
