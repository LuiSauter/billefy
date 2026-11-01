export type PlanLoadStatus = "loading" | "loaded" | "error" | "stale";

/**
 * Tracks which plan read is still allowed to apply its result. A read is discarded when a
 * newer read started (e.g. a client switch) or the user edited the plan locally meanwhile.
 */
export function createPlanLoadGuard() {
  let generation = 0;
  return {
    begin(): number {
      generation += 1;
      return generation;
    },
    markLocalEdit(): void {
      generation += 1;
    },
    invalidate(): void {
      generation += 1;
    },
    isCurrent(token: number): boolean {
      return token === generation;
    },
  };
}

/** Successful reads always load; failures keep a previously loaded plan as stale. */
export function nextPlanLoadStatus(current: PlanLoadStatus, succeeded: boolean): PlanLoadStatus {
  if (succeeded) return "loaded";
  return current === "loaded" || current === "stale" ? "stale" : "error";
}
