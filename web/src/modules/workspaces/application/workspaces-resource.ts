import {
  CreateWorkspaceRequest, InviteWorkspaceMemberRequest, IWorkspacesRepository,
  UpdateWorkspaceSettingsRequest, WorkspaceDetailDto, WorkspaceInvitationDto, WorkspaceSummaryDto,
} from "../domain/workspaces.types";
import { createWorkspaceStore, WorkspaceRequestState } from "./workspace-store";

interface WorkspacesState extends WorkspaceRequestState {
  workspaces: WorkspaceSummaryDto[];
  activeWorkspace: WorkspaceDetailDto | null;
  pendingInvitations: WorkspaceInvitationDto[];
}

export function createWorkspacesResource(repository: IWorkspacesRepository | null) {
  const store = createWorkspaceStore<WorkspacesState>({ workspaces: [], activeWorkspace: null, pendingInvitations: [], loading: false, error: null });
  let listGeneration = 0;
  let selectionGeneration = 0;
  const requireRepository = () => {
    if (!repository) throw new Error("Client not initialized");
    return repository;
  };
  const requireWorkspace = () => {
    const workspace = store.getSnapshot().activeWorkspace;
    if (!workspace) throw new Error("No workspace selected");
    return workspace;
  };
  const loadWorkspaces = () => store.run(async () => {
    const current = ++listGeneration;
    const repo = requireRepository();
    const [workspaces, pendingInvitations] = await Promise.all([repo.getWorkspaces(), repo.getPendingInvitations()]);
    if (current === listGeneration) {
      store.patch({ workspaces, pendingInvitations });
      const active = store.getSnapshot().activeWorkspace;
      if (active && !workspaces.some((w) => w.id === active.id)) {
        selectionGeneration++;
        store.patch({ activeWorkspace: null });
      }
    }
  });
  const selectWorkspace = (id: string) => {
    const current = ++selectionGeneration;
    store.patch({ activeWorkspace: null });
    return store.run(async () => {
      const activeWorkspace = await requireRepository().getWorkspace(id);
      if (current === selectionGeneration) store.patch({ activeWorkspace });
    });
  };
  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    loadWorkspaces,
    selectWorkspace,
    createWorkspace: (request: CreateWorkspaceRequest) => store.run(async () => {
      const current = selectionGeneration;
      const created = await requireRepository().createWorkspace(request);
      // The POST is committed; refresh is best-effort and must not hide its ID from the caller's checkpoint.
      try {
        await loadWorkspaces();
        if (current === selectionGeneration) await selectWorkspace(created.id);
      } catch {
        // The resource snapshot exposes the refresh error and can be retried independently.
      }
      return created;
    }),
    updateSettings: (request: UpdateWorkspaceSettingsRequest) => store.run(async () => {
      const workspace = requireWorkspace();
      const current = selectionGeneration;
      const repo = requireRepository();
      await repo.updateSettings(workspace.id, request);
      const activeWorkspace = await repo.getWorkspace(workspace.id);
      if (current === selectionGeneration) store.patch({ activeWorkspace });
    }),
    inviteMember: (request: InviteWorkspaceMemberRequest) => store.run(async () => {
      const workspace = requireWorkspace();
      return requireRepository().inviteMember(workspace.id, request);
    }),
    acceptInvitation: (id: string) => store.run(async () => {
      const member = await requireRepository().acceptInvitation(id);
      await loadWorkspaces();
      return member;
    }),
    rejectInvitation: (id: string) => store.run(async () => {
      await requireRepository().rejectInvitation(id);
      await loadWorkspaces();
    }),
  };
}
