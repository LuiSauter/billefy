"use client";

import React, { useState } from "react";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { SelectField } from "@/shared/ui/select-field";
import { Textarea } from "@/shared/ui/textarea";
import type { CreateSharedFinancialEventRequest, FinancialEventType, WorkspaceDetailDto } from "../domain/workspaces.types";
import { buildSharedEventRequest, sharedEventTypes, type SharedEventDraft } from "./workspace-calendar";
import { workspaceMemberLabel } from "./workspace-members";
import { WorkspaceMutationDrawer } from "./WorkspaceMutationDrawer";

export function CreateSharedEventModal({ workspace, date, viewerUserId, createEvent, onClose }: { workspace: WorkspaceDetailDto; date: string; viewerUserId?: string; createEvent: (request: CreateSharedFinancialEventRequest) => Promise<unknown>; onClose: () => void }) {
  const [draft, setDraft] = useState<SharedEventDraft>({ title: "", financialEventType: "Payment", dueDate: date, amount: "", responsibleMemberId: workspace.members.find((member) => member.isActive && member.userId === viewerUserId)?.id ?? "", notes: "" });
  const patch = (key: keyof SharedEventDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  return <WorkspaceMutationDrawer title="Nuevo evento compartido" description="Planifica un pago, cobro o aporte sin crear un movimiento." formId="create-shared-event" submitLabel="Crear evento" onClose={onClose} prepare={() => { const request = buildSharedEventRequest(draft, workspace); return () => createEvent(request); }}>
    <FormField label="Título" required>{(control) => <Input {...control} required maxLength={150} value={draft.title} onChange={(event) => patch("title", event.target.value)} />}</FormField>
    <FormField label="Tipo de evento">{(control) => <SelectField {...control} value={draft.financialEventType} options={sharedEventTypes} onChange={(event) => patch("financialEventType", event.target.value as FinancialEventType)} />}</FormField>
    <FormField label="Fecha" required>{(control) => <Input {...control} required type="date" value={draft.dueDate} onChange={(event) => patch("dueDate", event.target.value)} />}</FormField>
    <FormField label="Monto" required>{(control) => <MoneyInput {...control} required currency={workspace.baseCurrency} value={draft.amount} onValueChange={(value) => patch("amount", value)} />}</FormField>
    <FormField label="Responsable" required>{(control) => <SelectField {...control} required placeholder="Selecciona un integrante" value={draft.responsibleMemberId} options={workspace.members.filter((member) => member.isActive).map((member) => ({ value: member.id, label: workspaceMemberLabel(workspace.members, member.id, viewerUserId) }))} onChange={(event) => patch("responsibleMemberId", event.target.value)} />}</FormField>
    <p className="text-xs text-muted-foreground">Los eventos manuales requieren un responsable individual. Los compromisos automáticos pueden corresponder a todo el espacio.</p>
    <FormField label="Notas (opcional)">{(control) => <Textarea {...control} maxLength={300} value={draft.notes} onChange={(event) => patch("notes", event.target.value)} />}</FormField>
  </WorkspaceMutationDrawer>;
}
