"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { WorkspacesApiRepository } from "../infrastructure/workspaces-api.repository";
import { createWorkspacesResource } from "./workspaces-resource";

export function useWorkspaces(http: IHttpClient | null) {
  const repository = useMemo(() => http ? new WorkspacesApiRepository(http) : null, [http]);
  const resource = useMemo(() => createWorkspacesResource(repository), [repository]);
  const { getSnapshot, subscribe, ...actions } = resource;
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (repository) void resource.loadWorkspaces().catch(() => { /* Error is exposed by the resource. */ });
  }, [repository, resource]);
  return { ...state, ...actions };
}
