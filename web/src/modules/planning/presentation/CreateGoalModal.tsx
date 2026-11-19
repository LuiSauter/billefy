"use client";

import React, { useMemo, useRef, useState } from "react";
import Decimal from "decimal.js";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { CreateGoalRequest, GoalFundingMode } from "@/modules/planning/domain/planning.types";
import { eligibleGoalAccounts } from "@/modules/planning/domain/goals-overview";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { SelectField } from "@/shared/ui/select-field";
import { formatCurrencyLabel } from "@/shared/lib/currency";

interface CreateGoalModalProps { isOpen: boolean; accounts: AccountDto[]; onClose: () => void; onSubmit: (req: CreateGoalRequest) => Promise<void>; onOpenAccounts?: () => void; p2pRate?: number; }
const FORM_ID = "create-goal-form";
export function CreateGoalModal({ isOpen, accounts, onClose, onSubmit, onOpenAccounts }: CreateGoalModalProps) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currency, setCurrency] = useState("BOB");
  const [targetDate, setTargetDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [fundingMode, setFundingMode] = useState<GoalFundingMode>("ReservedFunds");
  const reserved = fundingMode === "ReservedFunds";
  const matchingAccounts = useMemo(() => eligibleGoalAccounts(accounts, currency), [accounts, currency]);
  let target: Decimal;
  try { target = new Decimal(targetAmount || 0); } catch { target = new Decimal(0); }
  const isValid = name.trim().length > 0 && target.isFinite() && target.gt(0) && (!reserved || matchingAccounts.some(a => a.id === accountId));
  const changeCurrency = (next: string) => { setCurrency(next); setAccountId(""); };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid || pending.current) return;
    pending.current = true; setSubmitting(true); setError("");
    try {
      await onSubmit({ name: name.trim(), targetAmount: target.toNumber(), currency, targetDate: targetDate || undefined, accountId: accountId || undefined, fundingMode });
      setName(""); setTargetAmount(""); setTargetDate(""); setAccountId(""); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la meta. Verificá la lista antes de repetir la operación."); }
    finally { pending.current = false; setSubmitting(false); }
  };
  return <ResponsiveDrawer open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()} size="md" title="Nueva meta" description={reserved ? "Empieza en cero. Después asignás dinero existente, sin moverlo ni bloquear tus gastos." : "El saldo completo de la cuenta vinculada determina el avance; no se reserva ni mueve dinero."} footer={<><Button type="submit" form={FORM_ID} size="lg" loading={submitting} disabled={!isValid || submitting} className="order-1 w-full md:order-2 md:flex-1">{submitting ? "Guardando…" : "Guardar meta"}</Button><Button type="button" variant="ghost" size="lg" disabled={submitting} onClick={onClose} className="order-2 w-full md:order-1 md:w-auto">Cancelar</Button></>}>
    <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <fieldset disabled={submitting} className="flex flex-col gap-5">
      <SegmentedControl aria-label="Modo de financiación" fullWidth value={fundingMode} onChange={value => setFundingMode(value as GoalFundingMode)} options={[{ value: "ReservedFunds", label: "Reservas explícitas" }, { value: "AccountTracking", label: "Saldo completo" }]} />
      <p className="text-sm text-muted-foreground">{reserved ? "Empieza en cero. La cuenta respalda la meta, pero solo tus asignaciones cuentan como reservado." : "El saldo completo sigue el avance. No se crea una reserva."}</p>
      <FormField label="Nombre de la meta" required>{(control) => <Input {...control} aria-label="Nombre de la meta" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Viaje, vivienda" />}</FormField>
      <div className="flex flex-col gap-2"><span className="text-sm font-semibold">Moneda</span><SegmentedControl aria-label="Moneda de la meta" fullWidth value={currency} onChange={changeCurrency} options={[{ value: "BOB", label: "BOB (Bs.)" }, { value: "USD", label: "USD ($)" }, { value: "USDT", label: "USDT" }]} /></div>
      <FormField label="Monto meta" required>{(control) => <MoneyInput {...control} aria-label="Monto meta" size="lg" currency={formatCurrencyLabel(currency)} value={targetAmount} onValueChange={setTargetAmount} />}</FormField>
      <FormField label="Fecha límite" hint="Opcional. La guía mensual solo aparece con seguimiento válido.">{(control) => <Input {...control} type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />}</FormField>
      <FormField label="Cuenta vinculada" required={reserved} hint={reserved ? "Requerida. Solo se muestran cuentas de la misma moneda; no se toma su saldo completo." : "Opcional. Su saldo completo cuenta para el avance."}>{(control) => <SelectField {...control} aria-label="Cuenta vinculada" value={accountId} onChange={(event) => setAccountId(event.target.value)} options={[{ value: "", label: reserved ? "Elegí una cuenta" : "Sin cuenta vinculada" }, ...matchingAccounts.map((account) => ({ value: account.id, label: account.name, description: account.currency }))]} />}</FormField>
      </fieldset>
      {matchingAccounts.length === 0 && <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground"><p>No hay cuentas activas en {currency}.</p>{onOpenAccounts && <Button type="button" variant="link" disabled={submitting} onClick={() => { onClose(); onOpenAccounts(); }}>Ver cuentas</Button>}</div>}
    </form>
  </ResponsiveDrawer>;
}
