import type { UpdateWorkspaceRequest, WorkspaceMemberDto, WorkspaceRole } from "../domain/workspaces.types";

export const workspaceRoleLabels: Record<WorkspaceRole, string> = { Owner: "Propietario", Admin: "Administrador", Member: "Integrante" };
export const workspacePermissions: { label: string; roles: WorkspaceRole[] }[] = [
  { label: "Ver finanzas compartidas", roles: ["Owner", "Admin", "Member"] },
  { label: "Registrar gastos, aportes y eventos", roles: ["Owner", "Admin", "Member"] },
  { label: "Configurar presupuesto y crear metas", roles: ["Owner", "Admin"] },
  { label: "Editar información y preferencias", roles: ["Owner", "Admin"] },
  { label: "Invitar integrantes", roles: ["Owner", "Admin"] },
  { label: "Retirar integrantes con rol Integrante", roles: ["Owner", "Admin"] },
  { label: "Retirar administradores", roles: ["Owner"] },
  { label: "Cambiar roles", roles: ["Owner"] },
  { label: "Desactivar espacio", roles: ["Owner"] },
];
export function canRemoveWorkspaceMember(actor: WorkspaceMemberDto | undefined, target: WorkspaceMemberDto) {
  return !!actor?.isActive && target.isActive && target.workspaceRole !== "Owner" && (actor.workspaceRole === "Owner" || (actor.workspaceRole === "Admin" && target.workspaceRole === "Member"));
}
export function buildWorkspaceInfoRequest(draft: { name: string; description: string; icon: string | null; color: string | null }): UpdateWorkspaceRequest {
  if (!draft.name.trim() || draft.name.trim().length > 120) throw new Error("Escribe un nombre de hasta 120 caracteres.");
  if (draft.description.length > 200) throw new Error("La descripción no puede superar 200 caracteres.");
  return { ...draft, name: draft.name.trim(), description: draft.description.trim() || null };
}
