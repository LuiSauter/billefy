"use client";

import React, { useState } from "react";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { WorkspaceMutationDrawer } from "./WorkspaceMutationDrawer";

export function DeactivateWorkspaceModal({ name, deactivate, onClose }: { name: string; deactivate: () => Promise<unknown>; onClose: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  return <WorkspaceMutationDrawer title="Desactivar espacio" description="El espacio dejará de estar disponible para sus integrantes." formId="deactivate-workspace" submitLabel="Confirmar desactivación" onClose={onClose} prepare={() => {
    if (confirmation !== name) throw new Error("Escribe el nombre exacto del espacio para confirmar.");
    return deactivate;
  }}><p className="text-sm text-muted-foreground">La API desactiva el espacio; no elimina permanentemente los datos. Esta versión no permite reactivarlo desde la interfaz.</p><FormField label={`Escribe «${name}» para confirmar`} required>{(control) => <Input {...control} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />}</FormField></WorkspaceMutationDrawer>;
}
