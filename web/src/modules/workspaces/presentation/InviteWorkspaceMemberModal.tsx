"use client";

import React, { useState } from "react";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { SelectField } from "@/shared/ui/select-field";
import type { InviteWorkspaceMemberRequest, WorkspaceRole } from "../domain/workspaces.types";
import { isInviteEmail } from "./workspace-creation";
import { WorkspaceInvitationLinkPanel } from "./WorkspaceInvitationLinkPanel";
import { WorkspaceMutationDrawer } from "./WorkspaceMutationDrawer";

interface Props {
  invite: (request: InviteWorkspaceMemberRequest) => Promise<unknown>;
  onClose: () => void;
  issueInvitationLink?: () => Promise<{ token: string; expiresAt: string }>;
}
export function InviteWorkspaceMemberModal({ invite, onClose, issueInvitationLink }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("Member");
  const [mode, setMode] = useState<"email" | "link">("email");
  if (mode === "link" && issueInvitationLink) return <WorkspaceMutationDrawer title="Invitar integrante" description="Comparte un enlace o invita por correo electrónico." formId="invite-workspace-member-link" submitLabel="Listo" onClose={onClose} prepare={() => () => Promise.resolve()}>
    <SegmentedControl aria-label="Método de invitación" value={mode} onChange={setMode} options={[{ value: "email", label: "Por correo" }, { value: "link", label: "Por enlace" }]} />
    <WorkspaceInvitationLinkPanel issueInvitationLink={issueInvitationLink} />
  </WorkspaceMutationDrawer>;
  return <WorkspaceMutationDrawer title="Invitar integrante" description="La invitación aparecerá en la cuenta del destinatario." formId="invite-workspace-member" submitLabel="Enviar invitación" onClose={onClose} prepare={() => {
    if (!isInviteEmail(email)) throw new Error("Escribe un correo electrónico válido.");
    if (role !== "Admin" && role !== "Member") throw new Error("Selecciona un rol válido.");
    return () => invite({ email: email.trim().toLowerCase(), workspaceRole: role });
  }}>
    {issueInvitationLink && <SegmentedControl aria-label="Método de invitación" value={mode} onChange={setMode} options={[{ value: "email", label: "Por correo" }, { value: "link", label: "Por enlace" }]} />}
    <FormField label="Correo electrónico" required>{(control) => <Input {...control} required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />}</FormField><FormField label="Rol">{(control) => <SelectField {...control} value={role} onChange={(event) => setRole(event.target.value as WorkspaceRole)} options={[{ value: "Member", label: "Integrante" }, { value: "Admin", label: "Administrador" }]} />}</FormField>
  </WorkspaceMutationDrawer>;
}
