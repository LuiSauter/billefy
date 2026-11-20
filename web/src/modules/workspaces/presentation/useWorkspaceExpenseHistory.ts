"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { IHttpClient } from "@/shared/application/http-client.contract";
import type { IWorkspacesRepository, WorkspaceExpenseDto } from "../domain/workspaces.types";
import { WorkspacesApiRepository } from "../infrastructure/workspaces-api.repository";
import { createWorkspaceStore } from "../application/workspace-store";

/** The details hook supplies only the API's default first page (100 expenses). */
export async function readWorkspaceExpenseHistory(repository: Pick<IWorkspacesRepository, "getExpenses">, workspaceId: string) {
  const expenses = new Map<string, WorkspaceExpenseDto>();
  const limit = 500;
  for (let offset = 0; ; offset += limit) {
    const page = await repository.getExpenses(workspaceId, { limit, offset });
    for (const expense of page) expenses.set(expense.id, expense);
    if (page.length < limit) return [...expenses.values()];
  }
}

export function useWorkspaceExpenseHistory(http: IHttpClient | null, workspaceId: string) {
  const resource = useMemo(() => {
    const repository = http ? new WorkspacesApiRepository(http) : null;
    const store = createWorkspaceStore({ expenses: [] as WorkspaceExpenseDto[], loaded: false, loading: false, error: null as string | null });
    let generation = 0;
    return {
      getSnapshot: store.getSnapshot,
      subscribe: store.subscribe,
      refresh: () => store.run(async () => {
        if (!repository) throw new Error("Client not initialized");
        const current = ++generation;
        const expenses = await readWorkspaceExpenseHistory(repository, workspaceId);
        if (current === generation) store.patch({ expenses, loaded: true });
      }),
    };
  }, [http, workspaceId]);
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);
  useEffect(() => {
    if (http) void resource.refresh().catch(() => { /* Exposed through the resource state. */ });
  }, [http, resource]);
  return { ...state, refresh: resource.refresh };
}
