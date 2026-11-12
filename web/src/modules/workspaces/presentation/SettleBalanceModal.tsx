"use client";

import React, { useRef, useState } from "react";
import Decimal from "decimal.js";
import { ArrowLeftRight, Check } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { FormField, FormGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { SelectField } from "@/shared/ui/select-field";
import { Textarea } from "@/shared/ui/textarea";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import type { PairwiseBalanceDto, SettleBalanceRequest, WorkspaceBalancesDto, WorkspaceMemberDto } from "../domain/workspaces.types";
import { buildSettlementRequest, type SettlementDraft } from "./workspace-balances";
import { workspaceMemberLabel } from "./workspace-members";
import { workspaceMoney } from "./workspace-ui";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: WorkspaceMemberDto[];
  balances: WorkspaceBalancesDto;
  currency: string;
  viewerUserId?: string;
  initialBalance?: PairwiseBalanceDto;
  settleBalance: (request: SettleBalanceRequest) => Promise<unknown>;
}
export function SettleBalanceModal({ open, onOpenChange, members, balances, currency, viewerUserId, initialBalance, settleBalance }: Props) {
  const actor = members.find((member) => member.userId === viewerUserId);
  const allowed = balances.pairwiseBalances.filter((balance) => balance.currency === currency && new Decimal(balance.amount).gt(0) && (!actor || actor.workspaceRole !== "Member" || balance.debtorMemberId === actor.id));
  const initial = allowed.find((balance) => balance.debtorMemberId === initialBalance?.debtorMemberId && balance.creditorMemberId === initialBalance.creditorMemberId) ?? allowed[0];
  const [draft, setDraft] = useState<SettlementDraft>(() => ({ payerMemberId: initial?.debtorMemberId ?? "", receiverMemberId: initial?.creditorMemberId ?? "", amount: initial ? String(initial.amount) : "", settlementDate: new Date().toLocaleDateString("en-CA"), notes: "" }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const inFlight = useRef(false);
  const debt = allowed.find((balance) => balance.debtorMemberId === draft.payerMemberId && balance.creditorMemberId === draft.receiverMemberId);
  const label = (id: string) => workspaceMemberLabel(members, id, viewerUserId);
  const change = (patch: Partial<SettlementDraft>) => { setDraft((current) => ({ ...current, ...patch })); setError(null); };
  const chooseDebt = (next?: PairwiseBalanceDto) => change({ payerMemberId: next?.debtorMemberId ?? "", receiverMemberId: next?.creditorMemberId ?? "", amount: next ? String(next.amount) : "" });
  const close = () => { if (!inFlight.current) onOpenChange(false); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current || uncertain) return;
    let request: SettleBalanceRequest;
    try {
      if (!debt) throw new Error("No hay saldo pendiente que puedas liquidar con estos integrantes.");
      request = buildSettlementRequest(draft, balances, currency);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Revisa los datos."); return; }
    inFlight.current = true; setSaving(true); setError(null);
    try { await settleBalance(request); onOpenChange(false); }
    catch { setUncertain(true); setError("No se pudo confirmar la liquidación. Cierra y actualiza los saldos antes de registrar otro pago para evitar duplicados."); }
    finally { inFlight.current = false; setSaving(false); }
  };
  return <ResponsiveDrawer open={open} onOpenChange={(value) => { if (!value) close(); }} title="Registrar liquidación" description="Confirma un pago entre integrantes. No crea un nuevo ingreso ni gasto compartido." hideCloseButton={saving} size="md" footer={<><Button variant="outline" disabled={saving} onClick={close}>Cancelar</Button><Button type="submit" form="workspace-settlement" loading={saving} disabled={uncertain || !debt}><Check />Confirmar liquidación</Button></>}>
    <form id="workspace-settlement" onSubmit={submit} className="space-y-4">
      <fieldset disabled={saving || uncertain} className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4"><ArrowLeftRight className="text-primary" /><div><p className="text-xs text-muted-foreground">Saldo pendiente</p><strong className="text-xl text-primary">{debt ? workspaceMoney(debt.amount, currency) : "Sin saldo disponible"}</strong></div></div>
        <FormGrid>
          <FormField label="Pagador" required>{(control) => <SelectField {...control} required value={draft.payerMemberId} placeholder="Quién paga" options={[...new Set(allowed.map((balance) => balance.debtorMemberId))].map((id) => ({ value: id, label: label(id) }))} onChange={(event) => chooseDebt(allowed.find((balance) => balance.debtorMemberId === event.target.value))} />}</FormField>
          <FormField label="Receptor" required>{(control) => <SelectField {...control} required value={draft.receiverMemberId} placeholder="Quién recibe" options={allowed.filter((balance) => balance.debtorMemberId === draft.payerMemberId).map((balance) => ({ value: balance.creditorMemberId, label: label(balance.creditorMemberId) }))} onChange={(event) => chooseDebt(allowed.find((balance) => balance.debtorMemberId === draft.payerMemberId && balance.creditorMemberId === event.target.value))} />}</FormField>
          <FormField label="Monto" required>{(control) => <MoneyInput {...control} required currency={currency} value={draft.amount} onValueChange={(amount) => change({ amount })} />}</FormField>
          <FormField label="Fecha" required>{(control) => <Input {...control} required type="date" value={draft.settlementDate} onChange={(event) => change({ settlementDate: event.target.value })} />}</FormField>
        </FormGrid>
        <FormField label="Notas (opcional)" hint={`${draft.notes.length} / 300`}>{(control) => <Textarea {...control} rows={3} maxLength={300} value={draft.notes} onChange={(event) => change({ notes: event.target.value })} />}</FormField>
      </fieldset>
      {!debt && <p role="status" className="text-sm text-muted-foreground">No hay saldos pendientes que puedas liquidar. Los miembros solo pueden registrar sus propios pagos.</p>}
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    </form>
  </ResponsiveDrawer>;
}
