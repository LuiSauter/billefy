"use client";

import { useMemo } from "react";
import { useAuth } from "@/modules/identity/application/AuthContext";
import { WorkspacesApiRepository } from "@/modules/workspaces/infrastructure/workspaces-api.repository";
import { JoinWorkspaceView } from "@/modules/workspaces/presentation/JoinWorkspaceView";
import { FetchHttpClient } from "@/shared/infrastructure/fetch-http.client";

export default function JoinWorkspacePage() {
  const { token, user } = useAuth();
  const repository = useMemo(() => new WorkspacesApiRepository(new FetchHttpClient({ authToken: token ?? undefined, userId: user?.id })), [token, user?.id]);
  return <JoinWorkspaceView repository={repository} />;
}
