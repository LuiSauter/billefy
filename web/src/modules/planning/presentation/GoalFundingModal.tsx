"use client";

import React, { useEffect, useRef, useState } from "react";
import Decimal from "decimal.js";
import { GoalDto, GoalFundingEntryDto, GoalFundingKind, GoalFundingRequest } from "../domain/planning.types";
import { combineDateAndTimeToIso, getLocalTimeString } from "@/modules/ledger/application/useTransactionFormDraft";
import { Amount } from "@/shared/ui/amount";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";

export interface GoalFundingModalProps {
  goal: GoalDto;
  onClose: () => void;
  onSubmit: (id: string, kind: GoalFundingKind, request: GoalFundingRequest, key: string) => Promise<void>;
  onGetHistory?: (id: string) => Promise<GoalFundingEntryDto[]>;
}

export function GoalFundingModal({ goal, onClose, onSubmit, onGetHistory }: GoalFundingModalProps) {
  const [kind, setKind] = useState<GoalFundingKind>("assign");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState(getLocalTimeString());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<GoalFundingEntryDto[] | null>(null);
  const [historyError, setHistoryError] = useState("");
  const pendingLock = useRef(false);
  const attemptKeys = useRef(new Map<string, string>());
  useEffect(() => {
    let active = true;
    if (onGetHistory) void onGetHistory(goal.id).then(entries => { if (active) setHistory(entries); }, cause => {
      if (active) setHistoryError(cause instanceof Error ? cause.message : "No se pudo cargar el historial.");
    });
    return () => { active = false; };
  }, [goal.id, onGetHistory]);
  let value = new Decimal(0);
  try { value = new Decimal(amount || 0); } catch { /* Invalid input remains unsavable. */ }
  const valid = value.isFinite() && value.gt(0) && (kind !== "release" || value.lte(new Decimal(goal.currentAmount ?? 0)));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || pendingLock.current) return;
    pendingLock.current = true; setPending(true); setError("");
    try {
      const request: GoalFundingRequest = { amount: value.toFixed(), currency: goal.currency,
        ...(date ? { occurredAt: combineDateAndTimeToIso(date, time) } : {}) };
      const fingerprint = JSON.stringify([goal.id, kind, request]);
      let key = attemptKeys.current.get(fingerprint);
      if (!key) { key = crypto.randomUUID(); attemptKeys.current.set(fingerprint, key); }
      await onSubmit(goal.id, kind, request, key);
      onClose();
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : "No se pudo confirmar el resultado."} No se reintentó automáticamente. Conservá estos datos para repetir la misma solicitud; cerrar y empezar otra puede duplicar una asignación si la anterior se guardó.`);
    } finally { pendingLock.current = false; setPending(false); }
  };
  return <ResponsiveDrawer open title="Administrar reserva" description={`${goal.name} · ${goal.accountName || "Cuenta no disponible"}`} size="md"
    onOpenChange={open => { if (!open && !pending) onClose(); }} hideCloseButton={pending}
    footer={<><Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cerrar</Button><Button type="submit" form="goal-funding-form" loading={pending} disabled={!valid || pending}>{kind === "assign" ? "Asignar dinero" : "Liberar dinero"}</Button></>}>
    <p className="mb-4 text-sm text-muted-foreground">Una reserva etiqueta dinero existente: no mueve efectivo ni bloquea gastos. Liberar conserva el historial.</p>
    <p className="mb-4 text-sm">Asignado a esta meta: <Amount value={goal.currentAmount ?? 0} currency={goal.currency} size="sm" /></p>
    <form id="goal-funding-form" onSubmit={submit} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        <SegmentedControl aria-label="Operación de reserva" fullWidth value={kind} onChange={value => setKind(value as GoalFundingKind)} options={[{ value: "assign", label: "Asignar" }, { value: "release", label: "Liberar" }]} />
        <FormField label="Monto de reserva" required hint={kind === "assign" ? "El servidor valida el saldo libre entre todas las metas de esta cuenta." : "No podés liberar más de lo asignado a esta meta."}>{control => <MoneyInput {...control} aria-label="Monto de reserva" value={amount} onValueChange={setAmount} currency={goal.currency} maxDecimals={goal.currency === "BTC" || goal.currency === "ETH" ? 8 : goal.currency === "USDT" ? 6 : 2} />}</FormField>
        <FormField label="Fecha efectiva" hint="Opcional. Sin fecha se usa el momento de registro.">{control => <Input {...control} aria-label="Fecha efectiva" type="date" value={date} onChange={event => setDate(event.target.value)} />}</FormField>
        {date && <FormField label="Hora local" required>{control => <Input {...control} aria-label="Hora local" type="time" required value={time} onChange={event => setTime(event.target.value)} />}</FormField>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </fieldset>
    </form>
    {onGetHistory && <section className="mt-6 space-y-3" aria-label="Historial de reservas">
      <h3 className="font-semibold">Historial de reservas</h3>
      {historyError ? <p role="alert" className="text-sm text-destructive">{historyError}</p> : history === null ? <p role="status" className="text-sm text-muted-foreground">Cargando historial…</p> : history.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay asignaciones ni liberaciones.</p> : <ul className="space-y-3">{history.map(entry => <li key={entry.id} className="rounded-lg border border-border p-3 text-sm">
        <p>{entry.kind === "assign" ? "Asignación" : "Liberación"}: <Amount value={entry.amount} currency={entry.currency} size="sm" /></p>
        <p className="break-words text-xs text-muted-foreground">Efectiva: <time dateTime={entry.occurredAt}>{new Date(entry.occurredAt).toLocaleString()}</time> · Registro: <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time></p>
      </li>)}</ul>}
    </section>}
  </ResponsiveDrawer>;
}
