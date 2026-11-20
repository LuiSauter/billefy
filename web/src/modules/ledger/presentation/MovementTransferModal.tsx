"use client";
import React, { useRef, useState } from "react";
import Decimal from "decimal.js";
import { AccountDto, RegisterTransferRequest } from "../domain/ledger.types";
import { combineDateAndTimeToIso, getLocalTimeString } from "../application/useTransactionFormDraft";
import { Amount } from "@/shared/ui/amount";
import { Button } from "@/shared/ui/button";
import { FormField, FormGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SelectField } from "@/shared/ui/select-field";
const positive = (value: string) => { try { return value.trim() !== "" && new Decimal(value).isFinite() && new Decimal(value).gt(0); } catch { return false; } };
interface Props { isOpen: boolean; accounts: AccountDto[]; onClose: () => void; onSubmit: (request: RegisterTransferRequest) => Promise<void> }
export function MovementTransferModal({ isOpen, accounts, onClose, onSubmit }: Props) {
  const [sourceId, setSourceId] = useState(accounts[0]?.id || "");
  const [destinationId, setDestinationId] = useState(accounts[1]?.id || accounts[0]?.id || "");
  const [sourceAmount, setSourceAmount] = useState(""); const [rate, setRate] = useState(""); const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false); const pendingLock = useRef(false); const [error, setError] = useState("");
  const [date, setDate] = useState(""); const [time, setTime] = useState(getLocalTimeString());
  if (!isOpen) return null;
  const source = accounts.find(a => a.id === sourceId); const destination = accounts.find(a => a.id === destinationId);
  const sourceCurrency = source?.currency; const destinationCurrency = destination?.currency;
  const sameCurrency = !!sourceCurrency && sourceCurrency === destinationCurrency;
  const dollarParity = (sourceCurrency === "USD" && destinationCurrency === "USDT") || (sourceCurrency === "USDT" && destinationCurrency === "USD");
  const supportedFx = (sourceCurrency === "BOB" && (destinationCurrency === "USD" || destinationCurrency === "USDT")) || ((sourceCurrency === "USD" || sourceCurrency === "USDT") && destinationCurrency === "BOB");
  const rateValue = positive(rate) ? new Decimal(rate).toDecimalPlaces(6, Decimal.ROUND_HALF_UP) : null;
  let destinationValue = "";
  try {
    if (positive(sourceAmount) && sameCurrency || positive(sourceAmount) && dollarParity) destinationValue = new Decimal(sourceAmount).toFixed(2);
    else if (positive(sourceAmount) && supportedFx && rateValue) destinationValue = sourceCurrency === "BOB" ? new Decimal(sourceAmount).div(rateValue).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2) : new Decimal(sourceAmount).times(rateValue).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
  } catch { destinationValue = ""; }
  const valid = !!source && !!destination && source.id !== destination.id && positive(sourceAmount) && !!destinationValue && (sameCurrency || dollarParity || (supportedFx && !!rateValue));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || pendingLock.current || !source || !destination) return;
    pendingLock.current = true; setPending(true); setError("");
    try {
      await onSubmit({ sourceAccountId: source.id, sourceAmount, destinationAccountId: destination.id, destinationAmount: destinationValue, ...(supportedFx ? { appliedRate: rateValue!.toFixed(6), rateSource: "Manual" } : {}), description: description.trim() || undefined, ...(date ? { occurredAt: combineDateAndTimeToIso(date, time) } : {}) });
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo registrar la transferencia. El resultado puede ser desconocido; verifica el historial antes de intentarlo otra vez."); }
    finally { pendingLock.current = false; setPending(false); }
  };
  return <ResponsiveDrawer open={isOpen} onOpenChange={(open) => { if (!open && !pending) onClose(); }} title="Registrar transferencia" size="md" hideCloseButton={pending} footer={<><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button><Button type="submit" form="movement-transfer-form" loading={pending} disabled={pending || !valid}>{pending ? "Guardando…" : "Guardar transferencia"}</Button></>}>
    <form id="movement-transfer-form" onSubmit={submit} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        <FormGrid>
          <FormField label="Cuenta origen">{(control) => <SelectField {...control} aria-label="Cuenta origen" value={sourceId} onChange={e => setSourceId(e.target.value)} options={accounts.map(a => ({ value: a.id, label: `${a.name} · ${a.currency}` }))} />}</FormField>
          <FormField label="Monto origen">{(control) => <MoneyInput {...control} aria-label="Monto origen" currency={sourceCurrency || "BOB"} maxDecimals={6} value={sourceAmount} onValueChange={setSourceAmount} />}</FormField>
          <FormField label="Cuenta destino">{(control) => <SelectField {...control} aria-label="Cuenta destino" value={destinationId} onChange={e => setDestinationId(e.target.value)} options={accounts.map(a => ({ value: a.id, label: `${a.name} · ${a.currency}` }))} />}</FormField>
          {supportedFx && <FormField label="Tasa manual BOB por USD" hint="Ingresá la cotización acordada. Se enviará con origen Manual, no como tasa de mercado.">{(control) => <Input {...control} aria-label="Tasa manual BOB por USD" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} />}</FormField>}
          <FormField label="Fecha" hint="Opcional. Sin fecha se usa la fecha y hora actual al registrar.">{(control) => <Input {...control} aria-label="Fecha" type="date" value={date} onChange={e => setDate(e.target.value)} />}</FormField>
          {date && <FormField label="Hora" hint="Fecha y hora en tu zona horaria local.">{(control) => <Input {...control} aria-label="Hora" type="time" required value={time} onChange={e => setTime(e.target.value)} />}</FormField>}
          <FormField label="Descripción">{(control) => <Input {...control} aria-label="Descripción" value={description} onChange={e => setDescription(e.target.value)} />}</FormField>
        </FormGrid>
        {destinationValue && destinationCurrency && <p className="text-sm">Monto destino calculado: <Amount value={destinationValue} currency={destinationCurrency} size="sm" /></p>}
        {!sameCurrency && !dollarParity && !supportedFx && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">Esta combinación de monedas no está soportada.</p>}
        {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error} No se reintentó automáticamente.</p>}
      </fieldset>
    </form>
  </ResponsiveDrawer>;
}
