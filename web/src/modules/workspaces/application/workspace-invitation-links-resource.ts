import type {
  AcceptWorkspaceInvitationLinkResponse,
  IWorkspacesRepository,
  WorkspaceInvitationLinkPreviewDto,
} from "../domain/workspaces.types";

export interface WorkspaceInvitationLinksState {
  preview: WorkspaceInvitationLinkPreviewDto | null;
  loading: boolean;
  accepting: boolean;
  error: string | null;
}

const initialState: WorkspaceInvitationLinksState = { preview: null, loading: false, accepting: false, error: null };

export function createWorkspaceInvitationLinksResource(repository: IWorkspacesRepository | null) {
  let state = { ...initialState };
  let source: { token: string | null; userId: string | null } = { token: null, userId: null };
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = (next: Partial<WorkspaceInvitationLinksState>) => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };
  const isCurrent = (request: number, token: string, userId: string) =>
    request === generation && source.token === token && source.userId === userId;

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
    setSource(token: string | null, userId: string | null) {
      if (source.token === token && source.userId === userId) return;
      source = { token, userId };
      generation++;
      publish({ ...initialState });
    },
    async preview(token: string, userId: string) {
      this.setSource(token, userId);
      const request = ++generation;
      if (!repository) {
        publish({ loading: false, error: "No se pudo cargar la invitación." });
        return null;
      }
      publish({ loading: true, accepting: false, preview: null, error: null });
      try {
        const result = await repository.previewInvitationLink(token);
        if (!isCurrent(request, token, userId)) return null;
        publish({ preview: result, loading: false, error: null });
        return result;
      } catch {
        if (isCurrent(request, token, userId)) publish({ preview: null, loading: false, error: "El enlace de invitación es inválido, ya fue utilizado o ha expirado." });
        return null;
      }
    },
    async accept(token: string, userId: string): Promise<AcceptWorkspaceInvitationLinkResponse | null> {
      this.setSource(token, userId);
      const request = ++generation;
      if (!repository) {
        publish({ accepting: false, error: "No se pudo aceptar la invitación." });
        return null;
      }
      publish({ loading: false, accepting: true, error: null });
      try {
        const result = await repository.acceptInvitationLink(token);
        if (!isCurrent(request, token, userId)) return null;
        publish({ accepting: false, error: null });
        return result;
      } catch {
        if (isCurrent(request, token, userId)) publish({ accepting: false, error: "El enlace de invitación es inválido, ya fue utilizado o ha expirado." });
        return null;
      }
    },
  };
}
