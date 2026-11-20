import { BudgetDto, CreateBudgetRequest, IPlanningRepository, UpdateBudgetRequest } from "../domain/planning.types";

type BudgetRepository = Pick<IPlanningRepository, "getBudgets" | "createBudget" | "updateBudget">;
export type BudgetRefreshResult =
  | { status: "refreshed" }
  | { status: "failed"; error: Error }
  | { status: "superseded" };
export interface BudgetMutationResult {
  applied: true;
  refresh: BudgetRefreshResult;
}
interface BudgetState {
  budgets: BudgetDto[];
  budgetsLoading: boolean;
  budgetsError: Error | null;
}

// One resource per client: replaced clients cannot publish into the new client's state.
export function createBudgetResource(repo: BudgetRepository | null) {
  let state: BudgetState = { budgets: [], budgetsLoading: false, budgetsError: null };
  let generation = 0;
  const listeners = new Set<() => void>();
  function publish(patch: Partial<BudgetState>) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  }
  function requireRepo() {
    if (!repo) throw new Error("Cliente no inicializado");
    return repo;
  }
  async function refreshBudgets(): Promise<BudgetRefreshResult> {
    const current = ++generation;
    publish({ budgetsLoading: true, budgetsError: null });
    try {
      const budgets = await requireRepo().getBudgets();
      if (current !== generation) return { status: "superseded" };
      publish({ budgets, budgetsLoading: false });
      return { status: "refreshed" };
    } catch (cause) {
      if (current !== generation) return { status: "superseded" };
      const error = cause instanceof Error ? cause : new Error("No se pudieron cargar los presupuestos");
      publish({ budgetsLoading: false, budgetsError: error });
      return { status: "failed", error };
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setBudgets(value: BudgetDto[] | ((previous: BudgetDto[]) => BudgetDto[])) {
      publish({ budgets: typeof value === "function" ? value(state.budgets) : value });
    },
    refreshBudgets,
    async createBudget(req: CreateBudgetRequest): Promise<BudgetMutationResult> {
      await requireRepo().createBudget(req);
      return { applied: true, refresh: await refreshBudgets() };
    },
    async updateBudget(id: string, req: UpdateBudgetRequest): Promise<BudgetMutationResult> {
      await requireRepo().updateBudget(id, req);
      // A failed reload is not a failed write: callers must retry the read, not resubmit.
      return { applied: true, refresh: await refreshBudgets() };
    },
  };
}
