import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceInvitationLinkPanel } from "./WorkspaceInvitationLinkPanel";

describe("WorkspaceInvitationLinkPanel initial render", () => {
  it("offers to generate a link and never shows one before the request resolves", () => {
    const issueInvitationLink = vi.fn().mockResolvedValue({ token: "unused", expiresAt: "2026-06-01T00:00:00Z" });
    const html = renderToStaticMarkup(<WorkspaceInvitationLinkPanel issueInvitationLink={issueInvitationLink} />);
    expect(html).toContain("Generar enlace de invitación");
    expect(html).not.toContain("join-workspace");
    expect(issueInvitationLink).not.toHaveBeenCalled();
  });

  it("explains anyone with the link joins as a Member and that Billefy does not send it", () => {
    const issueInvitationLink = vi.fn();
    const html = renderToStaticMarkup(<WorkspaceInvitationLinkPanel issueInvitationLink={issueInvitationLink} />);
    expect(html).toContain("Integrante");
    expect(html).toContain("Billefy no envía el mensaje por ti.");
  });
});
