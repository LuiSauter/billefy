"use client";

import React, { useState } from "react";
import { FormField } from "@/shared/ui/form-field";
import { SelectField } from "@/shared/ui/select-field";
import type { WorkspaceMemberDto, WorkspaceRole } from "../domain/workspaces.types";
import { WorkspaceMutationDrawer } from "./WorkspaceMutationDrawer";

export function WorkspaceMemberActionModal({ member, label, mode, apply, onClose }: { member: WorkspaceMemberDto; label: string; mode: "remove" | "role"; apply: (role: WorkspaceRole) => Promise<unknown>; onClose: () => void }) {
  const [role, setRole] = useState<WorkspaceRole>(member.workspaceRole);
  return <WorkspaceMutationDrawer title={mode === "remove" ? "Retirar integrante" : "Cambiar rol"} description={label} formId="workspace-member-action" submitLabel={mode === "remove" ? "Confirmar retiro" : "Guardar rol"} onClose={onClose} prepare={() => {
    if (member.workspaceRole === "Owner" || (role !== "Member" && role !== "Admin")) throw new Error("No se puede cambiar la propiedad del espacio.");
    return () => apply(role);
  }}>{mode === "remove" ? <p className="text-sm text-muted-foreground">Este integrante perderá acceso al espacio. Sus gastos y aportes anteriores se conservan. ¿Confirmas el retiro?</p> : <FormField label="Nuevo rol">{(control) => <SelectField {...control} value={role} onChange={(event) => setRole(event.target.value as WorkspaceRole)} options={[{ value: "Member", label: "Integrante" }, { value: "Admin", label: "Administrador" }]} />}</FormField>}</WorkspaceMutationDrawer>;
}
