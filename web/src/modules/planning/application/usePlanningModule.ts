"use client";

import { useMemo, useCallback, useSyncExternalStore } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { CreateBudgetRequest, CreateGoalRequest, ProposeIncomeDistributionRequest } from "../domain/planning.types";
import { PlanningApiRepository } from "../infrastructure/planning-api.repository";
import { createBudgetResource } from "./budget-resource";
import { createPlanningOverviewResource } from "./planning-overview-resource";

export function usePlanningModule(http: IHttpClient | null) {
  const repo = useMemo(() => http ? new PlanningApiRepository(http) : null, [http]);
  const budgetResource = useMemo(() => createBudgetResource(repo), [repo]);
  const overview = useMemo(() => createPlanningOverviewResource(repo), [repo]);
  const budgetState = useSyncExternalStore(budgetResource.subscribe, budgetResource.getSnapshot, budgetResource.getSnapshot);
  const overviewState = useSyncExternalStore(overview.subscribe, overview.getSnapshot, overview.getSnapshot);
  const refreshGoalsAndHealth = overview.refresh;
  const refreshPlanning = useCallback(async () => {
    await Promise.all([budgetResource.refreshBudgets(), overview.refresh()]);
  }, [budgetResource, overview]);
  const createBudget = useCallback(async (request: CreateBudgetRequest) => {
    await budgetResource.createBudget(request);
    await overview.refresh();
  }, [budgetResource, overview]);
  const createGoal = useCallback(async (request: CreateGoalRequest) => {
    if (!repo) throw new Error("Cliente no inicializado");
    await overview.createGoal(request);
  }, [repo, overview]);
  const proposeIncomeDistribution = useCallback(async (request: ProposeIncomeDistributionRequest) => {
    if (!repo) throw new Error("Cliente no inicializado");
    return repo.proposeIncomeDistribution(request);
  }, [repo]);
  return {
    budgets: budgetState.budgets, budgetsLoading: budgetState.budgetsLoading, budgetsError: budgetState.budgetsError,
    refreshBudgets: budgetResource.refreshBudgets, setBudgets: budgetResource.setBudgets,
    goals: overviewState.goals, setGoals: overview.setGoals,
    health: overviewState.health, setHealth: overview.setHealth,
    planningOverviewStatus: overviewState.status, planningOverviewError: overviewState.error,
    refreshGoalsAndHealth, refreshPlanning, retryPlanningOverview: overview.refresh,
    createBudget, updateBudget: budgetResource.updateBudget, createGoal, proposeIncomeDistribution,
  };
}
