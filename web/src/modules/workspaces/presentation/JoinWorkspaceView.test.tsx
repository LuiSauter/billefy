import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceJoinContent } from "./JoinWorkspaceView";
import type { WorkspaceInvitationLinkPreviewDto } from "../domain/workspaces.types";

const invitation: WorkspaceInvitationLinkPreviewDto = {
  workspaceId: "workspace-id",
  workspaceName: "Casa compartida",
  workspaceRole: "Member",
  expiresAt: "2026-06-01T00:00:00Z",
  alreadyMember: false,
};
const noop = vi.fn();

describe("JoinWorkspaceView invitation states", () => {
  it("shows verified workspace details and requires an explicit acceptance click", () => {
    const html = renderToStaticMarkup(<WorkspaceJoinContent preview={invitation} loading={false} accepting={false} error={null} onAccept={noop} onGoHome={noop} onGoToWorkspace={noop} />);
    expect(html).toContain("Casa compartida");
    expect(html).toContain("Rol: Miembro");
    expect(html).toContain("Aceptar invitación");
    expect(noop).not.toHaveBeenCalled();
  });

  it("offers navigation without acceptance for existing members", () => {
    const html = renderToStaticMarkup(<WorkspaceJoinContent preview={{ ...invitation, alreadyMember: true }} loading={false} accepting={false} error={null} onAccept={noop} onGoHome={noop} onGoToWorkspace={noop} />);
    expect(html).toContain("Ya formas parte de este espacio compartido.");
    expect(html).toContain("Ir al espacio");
    expect(html).not.toContain("Aceptar invitación");
  });

  it("renders a clean generic error and safe home action", () => {
    const html = renderToStaticMarkup(<WorkspaceJoinContent preview={null} loading={false} accepting={false} error="El enlace de invitación es inválido, ya fue utilizado o ha expirado." onAccept={noop} onGoHome={noop} onGoToWorkspace={noop} />);
    expect(html).toContain("El enlace de invitación es inválido, ya fue utilizado o ha expirado.");
    expect(html).toContain("Ir al inicio");
    expect(html).not.toContain("token");
  });
});
