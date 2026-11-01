"use client";

import React, { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { CreateGoalRequest } from "@/modules/planning/domain/planning.types";
import { eligibleGoalAccounts } from "@/modules/planning/domain/goals-overview";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { SelectField } from "@/shared/ui/select-field";

interface CreateGoalModalProps { isOpen: boolean; accounts: AccountDto[]; onClose: () => void; onSubmit: (req: CreateGoalRequest) => Promise<void>; onOpenAccounts?: () => void; p2pRate?: number; }
const FORM_ID = "create-goal-form";
export function CreateGoalModal({ isOpen, accounts, onClose, onSubmit, onOpenAccounts }: CreateGoalModalProps) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currency, setCurrency] = useState("BOB");
  const [targetDate, setTargetDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const matchingAccounts = useMemo(() => eligibleGoalAccounts(accounts, currency), [accounts, currency]);
  let target: Decimal;
  try { target = new Decimal(targetAmount || 0); } catch { target = new Decimal(0); }
  const isValid = name.trim().length > 0 && target.isFinite() && target.gt(0);
  const changeCurrency = (next: string) => { setCurrency(next); setAccountId(""); };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), targetAmount: target.toNumber(), currency, targetDate: targetDate || undefined, accountId: accountId || undefined });
      setName(""); setTargetAmount(""); setTargetDate(""); setAccountId(""); onClose();
    } finally { setSubmitting(false); }
  };
  return <ResponsiveDrawer open={isOpen} onOpenChange={(open) => !open && onClose()} size="md" title="Nueva meta" description="El saldo de la cuenta vinculada seguirá el avance; no se reserva ni mueve dinero." footer={<><Button type="submit" form={FORM_ID} size="lg" loading={submitting} disabled={!isValid} className="order-1 w-full md:order-2 md:flex-1">{submitting ? "Guardando…" : "Guardar meta"}</Button><Button type="button" variant="ghost" size="lg" onClick={onClose} className="order-2 w-full md:order-1 md:w-auto">Cancelar</Button></>}>
    <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FormField label="Nombre de la meta" required>{(control) => <Input {...control} type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Viaje, vivienda" />}</FormField>
      <div className="flex flex-col gap-2"><span className="text-sm font-semibold">Moneda</span><SegmentedControl aria-label="Moneda de la meta" fullWidth value={currency} onChange={changeCurrency} options={[{ value: "BOB", label: "BOB (Bs.)" }, { value: "USD", label: "USD ($)" }, { value: "USDT", label: "USDT" }]} /></div>
      <FormField label="Monto meta" required>{(control) => <MoneyInput {...control} size="lg" currency={currency === "BOB" ? "Bs" : currency === "USD" ? "$" : "USDT"} value={targetAmount} onValueChange={setTargetAmount} />}</FormField>
      <FormField label="Fecha límite" hint="Opcional. La guía mensual solo aparece con seguimiento válido.">{(control) => <Input {...control} type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />}</FormField>
      <FormField label="Cuenta vinculada" hint="Opcional. Solo aparecen cuentas en la moneda elegida; su saldo completo cuenta para el avance.">{(control) => <SelectField {...control} value={accountId} onChange={(event) => setAccountId(event.target.value)} options={[{ value: "", label: "Sin cuenta vinculada" }, ...matchingAccounts.map((account) => ({ value: account.id, label: account.name, description: account.currency }))]} />}</FormField>
      {matchingAccounts.length === 0 && <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground"><p>No hay cuentas activas en {currency}.</p>{onOpenAccounts && <button type="button" onClick={() => { onClose(); onOpenAccounts(); }} className="mt-2 min-h-11 font-semibold text-primary underline">Ver cuentas</button>}</div>}
    </form>
  </ResponsiveDrawer>;
}
