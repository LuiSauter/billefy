import {
  ContributeSharedGoalRequest, CreateSharedFinancialEventRequest, CreateSharedGoalRequest,
  IWorkspacesRepository, RegisterWorkspaceExpenseRequest, SetSharedBudgetRequest, SettleBalanceRequest,
  SharedBudgetDto, SharedFinancialEventDto, SharedGoalDto, WorkspaceBalancesDto, WorkspaceDashboardDto,
  WorkspaceExpenseDto, WorkspaceMonthlyReportDto, WorkspacePeriod,
} from "../domain/workspaces.types";
import { createWorkspaceStore, WorkspaceRequestState } from "./workspace-store";

interface WorkspaceDetailsState extends WorkspaceRequestState {
  dashboard: WorkspaceDashboardDto | null;
  expenses: WorkspaceExpenseDto[];
  balances: WorkspaceBalancesDto | null;
  budget: SharedBudgetDto | null;
  goals: SharedGoalDto[];
  calendar: SharedFinancialEventDto[];
  reports: WorkspaceMonthlyReportDto | null;
}

export function createWorkspaceDetailsResource(repository: IWorkspacesRepository | null, workspaceId: string | null, selectedPeriod?: WorkspacePeriod) {
  const store = createWorkspaceStore<WorkspaceDetailsState>({ dashboard: null, expenses: [], balances: null, budget: null, goals: [], calendar: [], reports: null, loading: false, error: null });
  let generation = 0;
  // Resolve the period once so every subresource uses the same month, including calendar bounds.
  const now = new Date();
  const year = selectedPeriod?.year ?? now.getUTCFullYear();
  const month = selectedPeriod?.month ?? now.getUTCMonth() + 1;
  const period = { year, month };
  const requireContext = () => {
    if (!repository) throw new Error("Client not initialized");
    if (!workspaceId) throw new Error("No workspace selected");
    return { repo: repository, id: workspaceId };
  };
  const refreshAll = () => store.run(async () => {
    if (!workspaceId) return;
    const { repo, id } = requireContext();
    const current = ++generation;
    if (!Number.isInteger(year) || year < 1 || year > 9998 || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("Invalid workspace period");
    }
    const prefix = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
    // Use UTC and setUTCFullYear to avoid Date's special handling of years 1–99.
    const end = new Date(0);
    end.setUTCFullYear(year, month, 0);
    const range = { from: `${prefix}-01`, to: `${prefix}-${String(end.getUTCDate()).padStart(2, "0")}` };
    const [dashboard, expenses, balances, budget, goals, calendar, reports] = await Promise.all([
      repo.getDashboard(id, period), repo.getExpenses(id), repo.getBalances(id), repo.getBudget(id, period),
      repo.getGoals(id), repo.getCalendar(id, range), repo.getReports(id, period),
    ]);
    if (current === generation) store.patch({ dashboard, expenses, balances, budget, goals, calendar, reports });
  });
  const mutate = <T>(operation: (repo: IWorkspacesRepository, id: string) => Promise<T>) => store.run(async () => {
    const { repo, id } = requireContext();
    const result = await operation(repo, id);
    await refreshAll();
    return result;
  });
  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    refreshAll,
    registerExpense: (request: RegisterWorkspaceExpenseRequest) => mutate((repo, id) => repo.registerExpense(id, request)),
    settleBalance: (request: SettleBalanceRequest) => mutate((repo, id) => repo.settleBalance(id, request)),
    setBudget: (request: SetSharedBudgetRequest) => mutate((repo, id) => repo.setBudget(id, request)),
    createGoal: (request: CreateSharedGoalRequest) => mutate((repo, id) => repo.createGoal(id, request)),
    contributeGoal: (goalId: string, request: ContributeSharedGoalRequest) => mutate((repo, id) => repo.contributeGoal(id, goalId, request)),
    createCalendarEvent: (request: CreateSharedFinancialEventRequest) => mutate((repo, id) => repo.createCalendarEvent(id, request)),
  };
}
