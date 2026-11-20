"use client";

import React, { useRef, useState } from "react";
import { Check, Landmark } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { FormField, FormGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { SelectField } from "@/shared/ui/select-field";
import { Textarea } from "@/shared/ui/textarea";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import type { RegisterWorkspaceIncomeRequest, WorkspaceMemberDto } from "../domain/workspaces.types";
import { buildIncomeRequest, initialIncomeDraft } from "./workspace-income";
import { workspaceMemberLabel } from "./workspace-members";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: WorkspaceMemberDto[];
  currency: string;
  viewerUserId?: string;
  registerIncome: (request: RegisterWorkspaceIncomeRequest) => Promise<unknown>;
}
export function RegisterWorkspaceIncomeModal({ open, onOpenChange, members, currency, viewerUserId, registerIncome }: Props) {
  const [draft, setDraft] = useState(() => initialIncomeDraft(members, viewerUserId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const inFlight = useRef(false);
  const { getCategoriesByDirection } = useUserCategories();
  const active = members.filter((member) => member.isActive);
  const change = (patch: Partial<typeof draft>) => { setDraft((current) => ({ ...current, ...patch })); setError(null); };
  const close = () => { if (!inFlight.current) onOpenChange(false); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current || uncertain) return;
    let request: RegisterWorkspaceIncomeRequest;
    try { request = buildIncomeRequest(draft, members, currency); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Revisa los datos del ingreso."); return; }
    inFlight.current = true; setSaving(true); setError(null);
    try { await registerIncome(request); onOpenChange(false); }
    catch {
      setUncertain(true);
      setError("No se pudo confirmar el registro. Cierra y actualiza los ingresos antes de volver a registrarlo para evitar duplicados.");
    } finally { inFlight.current = false; setSaving(false); }
  };
  return <ResponsiveDrawer open={open} onOpenChange={(value) => { if (!value) close(); }} hideCloseButton={saving} size="md" title="Registrar ingreso compartido" description="Registra dinero recibido para el espacio compartido, como un sueldo o reembolso." footer={<><Button variant="outline" disabled={saving} onClick={close}>Cancelar</Button><Button type="submit" form="workspace-income" loading={saving} disabled={saving || uncertain || !active.length}><Check />Registrar ingreso</Button></>}>
    <form id="workspace-income" onSubmit={submit} className="space-y-4">
      <fieldset disabled={saving || uncertain} className="space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold"><Landmark className="text-primary" />Registrar ingreso compartido</h3>
        <FormField label="Descripción" required>{(control) => <Input {...control} required maxLength={200} value={draft.description} placeholder="¿De qué ingreso se trata?" onChange={(event) => change({ description: event.target.value })} />}</FormField>
        <FormGrid>
          <FormField label="Categoría" required>{(control) => <SelectField {...control} required placeholder="Selecciona una categoría" value={draft.categoryId} options={getCategoriesByDirection("Income").map((item) => ({ value: item.id, label: item.name }))} onChange={(event) => change({ categoryId: event.target.value })} />}</FormField>
          <FormField label="Fecha" required>{(control) => <Input {...control} required type="date" value={draft.date} onChange={(event) => change({ date: event.target.value })} />}</FormField>
          <FormField label="Monto" required>{(control) => <MoneyInput {...control} required currency={currency} value={draft.amount} onValueChange={(amount) => change({ amount })} />}</FormField>
          <FormField label="Recibido por" required>{(control) => <SelectField {...control} required value={draft.receivedByMemberId} placeholder="Selecciona integrante" options={active.map((member) => ({ value: member.id, label: workspaceMemberLabel(members, member.id, viewerUserId) }))} onChange={(event) => change({ receivedByMemberId: event.target.value })} />}</FormField>
        </FormGrid>
        <FormField label="Notas (opcional)" hint={`${draft.notes.length} / 300`}>{(control) => <Textarea {...control} maxLength={300} rows={3} placeholder="Agrega una nota o detalle adicional…" value={draft.notes} onChange={(event) => change({ notes: event.target.value })} />}</FormField>
        {!active.length && <p role="alert" className="text-sm text-destructive">No hay integrantes activos para registrar un ingreso.</p>}
        {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </fieldset>
    </form>
  </ResponsiveDrawer>;
}
