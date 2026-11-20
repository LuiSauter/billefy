import { describe, expect, it, vi } from "vitest";
import type { IWorkspacesRepository, WorkspaceInvitationLinkPreviewDto } from "../domain/workspaces.types";
import { createWorkspaceInvitationLinksResource } from "./workspace-invitation-links-resource";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const preview: WorkspaceInvitationLinkPreviewDto = { workspaceId: "w", workspaceName: "Casa", workspaceRole: "Member", expiresAt: "2026-06-01T00:00:00Z", alreadyMember: false };
function setup() {
  const repository = { previewInvitationLink: vi.fn(), acceptInvitationLink: vi.fn() } as unknown as IWorkspacesRepository;
  return { repository, resource: createWorkspaceInvitationLinksResource(repository) };
}

describe("workspace invitation link resource", () => {
  it("publishes preview and acceptance states around successful operations", async () => {
    const { repository, resource } = setup();
    vi.mocked(repository.previewInvitationLink).mockResolvedValue(preview);
    vi.mocked(repository.acceptInvitationLink).mockResolvedValue({ workspaceId: "w", membershipId: "m" });
    const previewing = resource.preview("token", "user-a");
    expect(resource.getSnapshot()).toMatchObject({ loading: true, preview: null, error: null });
    await previewing;
    expect(resource.getSnapshot()).toMatchObject({ loading: false, preview, error: null });
    const accepting = resource.accept("token", "user-a");
    expect(resource.getSnapshot().accepting).toBe(true);
    await expect(accepting).resolves.toEqual({ workspaceId: "w", membershipId: "m" });
    expect(resource.getSnapshot().accepting).toBe(false);
    expect(repository.previewInvitationLink).toHaveBeenCalledWith("token");
    expect(repository.acceptInvitationLink).toHaveBeenCalledWith("token");
  });

  it("ignores late responses after the authenticated source changes", async () => {
    const { repository, resource } = setup();
    const pending = deferred<WorkspaceInvitationLinkPreviewDto>();
    vi.mocked(repository.previewInvitationLink).mockReturnValue(pending.promise);
    const request = resource.preview("token", "user-a");
    resource.setSource("token", "user-b");
    pending.resolve(preview);
    await request;
    expect(resource.getSnapshot()).toMatchObject({ preview: null, loading: false });
  });

  it("clears stale operation state and exposes safe service errors", async () => {
    const { repository, resource } = setup();
    vi.mocked(repository.previewInvitationLink).mockRejectedValue(new Error("expired"));
    await expect(resource.preview("token", "user-a")).resolves.toBeNull();
    expect(resource.getSnapshot()).toMatchObject({ preview: null, loading: false, error: "El enlace de invitación es inválido, ya fue utilizado o ha expirado." });
    resource.setSource(null, null);
    expect(resource.getSnapshot()).toMatchObject({ preview: null, error: null, loading: false });
  });
});
