import { FinancialHealthDto, GoalDto, IPlanningRepository } from "../domain/planning.types";

export type OverviewStatus = "idle" | "loading" | "error" | "stale" | "refreshing" | "ready";
export type OverviewRefreshResult = { status: "refreshed" } | { status: "failed"; error: Error } | { status: "superseded" };
export interface PlanningOverviewState { goals: GoalDto[]; health: FinancialHealthDto | null; status: OverviewStatus; error: Error | null; }
const emptyState = (): PlanningOverviewState => ({ goals: [], health: null, status: "idle", error: null });

export function createPlanningOverviewResource(initialRepository: IPlanningRepository | null) {
  let repository = initialRepository;
  let state = emptyState();
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = (next: PlanningOverviewState) => { state = next; listeners.forEach((listener) => listener()); };
  async function refresh(): Promise<OverviewRefreshResult> {
    const current = ++generation;
    const hadData = state.status === "ready" || state.status === "stale" || state.status === "refreshing";
    publish({ ...state, status: hadData ? "refreshing" : "loading", error: null });
    try {
      if (!repository) throw new Error("Cliente no inicializado");
      const [goals, health] = await Promise.all([repository.getGoals(), repository.getFinancialHealth()]);
      if (current !== generation) return { status: "superseded" };
      publish({ goals, health, status: "ready", error: null });
      return { status: "refreshed" };
    } catch (cause) {
      if (current !== generation) return { status: "superseded" };
      const error = cause instanceof Error ? cause : new Error("No se pudieron cargar las metas y la salud financiera");
      publish({ ...state, status: hadData ? "stale" : "error", error });
      return { status: "failed", error };
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setGoals(value: GoalDto[] | ((previous: GoalDto[]) => GoalDto[])) {
      publish({ ...state, goals: typeof value === "function" ? value(state.goals) : value, status: "ready", error: null });
    },
    setHealth(value: FinancialHealthDto | null | ((previous: FinancialHealthDto | null) => FinancialHealthDto | null)) {
      publish({ ...state, health: typeof value === "function" ? value(state.health) : value, status: "ready", error: null });
    },
    refresh,
    async createGoal(request: Parameters<IPlanningRepository["createGoal"]>[0]) {
      if (!repository) throw new Error("Cliente no inicializado");
      await repository.createGoal(request);
      return refresh();
    },
    async updateGoal(id: string, request: Parameters<IPlanningRepository["updateGoal"]>[1]) {
      if (!repository) throw new Error("Cliente no inicializado");
      await repository.updateGoal(id, request);
      return refresh();
    },
    async recordGoalFunding(...args: Parameters<IPlanningRepository["recordGoalFunding"]>) {
      if (!repository) throw new Error("Cliente no inicializado");
      await repository.recordGoalFunding(...args);
      return refresh();
    },
    async deleteGoal(id: string) {
      if (!repository) throw new Error("Cliente no inicializado");
      await repository.deleteGoal(id);
      return refresh();
    },
    replaceRepository(next: IPlanningRepository | null) {
      if (repository === next) return;
      repository = next;
      generation++;
      publish(emptyState());
    },
  };
}
