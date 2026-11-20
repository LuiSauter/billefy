"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { WorkspacePeriod } from "../domain/workspaces.types";
import { WorkspacesApiRepository } from "../infrastructure/workspaces-api.repository";
import { createWorkspaceDetailsResource } from "./workspace-details-resource";

export function useWorkspaceDetails(http: IHttpClient | null, workspaceId: string | null, period?: WorkspacePeriod) {
  const repository = useMemo(() => http ? new WorkspacesApiRepository(http) : null, [http]);
  const year = period?.year;
  const month = period?.month;
  // Replacing the resource immediately clears data on workspace, client or period changes.
  const resource = useMemo(() => createWorkspaceDetailsResource(repository, workspaceId, { year, month }), [repository, workspaceId, year, month]);
  const { getSnapshot, subscribe, ...actions } = resource;
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (repository && workspaceId) void resource.refreshAll().catch(() => { /* Error is exposed by the resource. */ });
  }, [repository, workspaceId, resource]);
  return { ...state, ...actions };
}
