"use client";

import React, { useState } from "react";
import { Check, Settings, UserPlus } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { IWorkspacesRepository, WorkspaceDetailDto, WorkspaceMemberDto } from "../domain/workspaces.types";
import { DeactivateWorkspaceModal } from "./DeactivateWorkspaceModal";
import { InviteWorkspaceMemberModal } from "./InviteWorkspaceMemberModal";
import { WorkspaceMemberActionModal } from "./WorkspaceMemberActionModal";
import { WorkspaceSettingsGeneral } from "./WorkspaceSettingsGeneral";
import { WorkspaceMember, workspaceMemberLabel } from "./workspace-members";
import { canRemoveWorkspaceMember, workspacePermissions, workspaceRoleLabels } from "./workspace-settings";
import { workspacePanel } from "./workspace-ui";

interface Props {
  workspace: WorkspaceDetailDto;
  viewerUserId?: string;
  repository: IWorkspacesRepository | null;
  onUpdated: (workspace: WorkspaceDetailDto) => void;
  onDeactivated: () => void;
}
const settingsTabs = ["General", "Integrantes", "Roles y permisos", "Plan y facturación", "Integraciones", "Automatizaciones"] as const;
type SettingsTab = typeof settingsTabs[number];
export function WorkspaceSettingsView({ workspace, viewerUserId, repository, onUpdated, onDeactivated }: Props) {
  const [tab, setTab] = useState<SettingsTab>("General");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invited, setInvited] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [memberAction, setMemberAction] = useState<{ member: WorkspaceMemberDto; mode: "remove" | "role" } | null>(null);
  const actor = workspace.members.find((member) => member.isActive && member.userId === viewerUserId);
  const canManage = workspace.isActive && !!actor && actor.workspaceRole !== "Member";
  const isOwner = workspace.isActive && actor?.workspaceRole === "Owner";
  const refresh = async () => { if (repository) onUpdated(await repository.getWorkspace(workspace.id)); };
  return <div className="space-y-5">
    <header><h1 className="flex items-center gap-3 text-2xl font-extrabold"><Settings className="size-8 text-chart-4" />Configuración</h1><p className="mt-2 text-sm text-muted-foreground">Administra la información, integrantes y preferencias de tu espacio.</p></header>
    <nav aria-label="Configuración del espacio" className="flex gap-2 overflow-x-auto rounded-2xl border border-border p-2">{settingsTabs.map((label) => <Button key={label} variant={tab === label ? "default" : "ghost"} aria-current={tab === label ? "page" : undefined} className={tab === label ? "bg-gradient-to-r from-chart-4 to-primary" : ""} onClick={() => setTab(label)}>{label}</Button>)}</nav>
    {tab === "General" && <WorkspaceSettingsGeneral key={`${workspace.id}-${JSON.stringify([workspace.name, workspace.description, workspace.icon, workspace.color, workspace.settings])}`} workspace={workspace} repository={repository} canManage={canManage} isOwner={isOwner} onUpdated={onUpdated} onDeactivate={() => setDeactivateOpen(true)} />}
    {tab === "Integrantes" && <section className={workspacePanel}><header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Integrantes del espacio</h2><Button disabled={!canManage || !repository} onClick={() => { setInvited(false); setInviteOpen(true); }}><UserPlus />Invitar integrante</Button></header>{invited && <p role="status" className="mb-4 text-sm text-emerald-500">Invitación enviada. El destinatario debe aceptarla para aparecer como integrante.</p>}<ul className="divide-y divide-border">{workspace.members.filter((member) => member.isActive).map((member) => <li key={member.id} className="flex flex-wrap items-center gap-3 py-4"><WorkspaceMember members={workspace.members} id={member.id} viewerUserId={viewerUserId} /><Badge variant="secondary">{workspaceRoleLabels[member.workspaceRole]}</Badge><span className="text-xs text-muted-foreground">Desde {member.joinedAt.slice(0, 10)}</span><div className="ml-auto flex gap-2">{member.workspaceRole !== "Owner" && <><Button variant="outline" size="sm" disabled={!isOwner || !repository} onClick={() => setMemberAction({ member, mode: "role" })}>Cambiar rol</Button><Button variant="outline" size="sm" className="text-destructive" disabled={!canManage || !repository || !canRemoveWorkspaceMember(actor, member)} onClick={() => setMemberAction({ member, mode: "remove" })}>Retirar</Button></>}</div></li>)}</ul><p className="mt-3 text-xs text-muted-foreground">La API no expone nombres ni correos de integrantes. Solo se muestran sus identificadores dentro del espacio. El propietario no puede retirarse ni transferir su rol en esta versión.</p></section>}
    {tab === "Roles y permisos" && <section className={workspacePanel}><h2 className="mb-4 text-lg font-bold">Roles y permisos</h2><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><caption className="sr-only">Permisos de los roles del espacio</caption><thead><tr className="border-b border-border"><th className="p-3">Permiso</th>{(["Owner", "Admin", "Member"] as const).map((role) => <th key={role} className="p-3 text-center">{workspaceRoleLabels[role]}</th>)}</tr></thead><tbody>{workspacePermissions.map((row) => <tr key={row.label} className="border-b border-border last:border-0"><th className="p-3 font-medium">{row.label}</th>{(["Owner", "Admin", "Member"] as const).map((role) => <td key={role} className="p-3 text-center">{row.roles.includes(role) ? <Check aria-label="Permitido" className="mx-auto size-5 text-emerald-500" /> : <span aria-label="No permitido" className="text-muted-foreground">—</span>}</td>)}</tr>)}</tbody></table></div><p className="mt-4 text-xs text-muted-foreground">Los permisos son definidos por el servidor; no se pueden personalizar. Cambia el rol de un integrante desde la pestaña Integrantes.</p></section>}
    {tab === "Plan y facturación" && <section className={workspacePanel}><h2 className="mb-3 text-lg font-bold">Plan y facturación</h2><Badge variant="outline">No disponible en esta versión</Badge><p className="mt-4 text-sm text-muted-foreground">El servicio no proporciona información de suscripción, facturación ni límites de espacios. No se muestran planes o cupos estimados.</p><Button className="mt-4" disabled>Gestionar plan · Próximamente</Button></section>}
    {tab === "Integraciones" && <section className={workspacePanel}><h2 className="mb-3 text-lg font-bold">Integraciones</h2><Badge variant="outline">Próximamente</Badge><p className="mt-3 text-sm text-muted-foreground">No hay contratos de integraciones externas para espacios en esta versión.</p></section>}
    {tab === "Automatizaciones" && <section className={workspacePanel}><h2 className="mb-3 text-lg font-bold">Automatizaciones</h2><p className="text-sm text-muted-foreground">El calendario incluye los cierres de presupuestos y compromisos mensuales de metas definidos en el espacio. No realizan pagos ni crean movimientos automáticamente.</p><p className="mt-3 text-sm text-muted-foreground">Reglas personalizadas: No disponible en esta versión.</p><Button className="mt-4" disabled>Crear automatización · Próximamente</Button></section>}
    {inviteOpen && canManage && repository && <InviteWorkspaceMemberModal onClose={() => setInviteOpen(false)} invite={async (request) => { await repository.inviteMember(workspace.id, request); setInvited(true); }} issueInvitationLink={() => repository.issueInvitationLink(workspace.id)} />}
    {memberAction && repository && canManage && <WorkspaceMemberActionModal key={`${memberAction.member.id}-${memberAction.mode}`} {...memberAction} label={workspaceMemberLabel(workspace.members, memberAction.member.id, viewerUserId)} onClose={() => setMemberAction(null)} apply={async (role) => {
      if (memberAction.mode === "role") {
        if (!isOwner) throw new Error("Owner required");
        await repository.updateMemberRole(workspace.id, memberAction.member.id, { workspaceRole: role });
      } else {
        if (!canRemoveWorkspaceMember(actor, memberAction.member)) throw new Error("Permission required");
        await repository.removeMember(workspace.id, memberAction.member.id);
      }
      if (memberAction.mode === "remove" && memberAction.member.id === actor?.id) onDeactivated();
      else await refresh();
    }} />}
    {deactivateOpen && isOwner && repository && <DeactivateWorkspaceModal name={workspace.name} onClose={() => setDeactivateOpen(false)} deactivate={async () => { await repository.deactivateWorkspace(workspace.id); onDeactivated(); }} />}
  </div>;
}
