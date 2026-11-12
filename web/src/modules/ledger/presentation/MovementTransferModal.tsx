"use client";
import React, { useRef, useState } from "react";
import Decimal from "decimal.js";
import { AccountDto, RegisterTransferRequest } from "../domain/ledger.types";
import { Amount } from "@/shared/ui/amount";
const positive = (value: string) => { try { return value.trim() !== "" && new Decimal(value).isFinite() && new Decimal(value).gt(0); } catch { return false; } };
interface Props { isOpen: boolean; accounts: AccountDto[]; onClose: () => void; onSubmit: (request: RegisterTransferRequest) => Promise<void> }
export function MovementTransferModal({ isOpen, accounts, onClose, onSubmit }: Props) {
  const [sourceId, setSourceId] = useState(accounts[0]?.id || "");
  const [destinationId, setDestinationId] = useState(accounts[1]?.id || accounts[0]?.id || "");
  const [sourceAmount, setSourceAmount] = useState(""); const [rate, setRate] = useState(""); const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false); const pendingLock = useRef(false); const [error, setError] = useState("");
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
  const submit = async () => {
    if (!valid || pendingLock.current || !source || !destination) return;
    pendingLock.current = true; setPending(true); setError("");
    try {
      await onSubmit({ sourceAccountId: source.id, sourceAmount, destinationAccountId: destination.id, destinationAmount: destinationValue, ...(supportedFx ? { appliedRate: rateValue!.toFixed(6), rateSource: "Manual" } : {}), description: description.trim() || undefined });
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo registrar la transferencia. El resultado puede ser desconocido; verifica el historial antes de intentarlo otra vez."); }
    finally { pendingLock.current = false; setPending(false); }
  };
  return <div role="dialog" aria-modal="true" aria-label="Registrar transferencia" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"><div className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">Registrar transferencia</h2>
    <label className="block text-sm">Cuenta origen<select aria-label="Cuenta origen" value={sourceId} onChange={e=>setSourceId(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2">{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
    <label className="block text-sm">Monto origen<input aria-label="Monto origen" inputMode="decimal" value={sourceAmount} onChange={e=>setSourceAmount(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2" /></label>
    <label className="block text-sm">Cuenta destino<select aria-label="Cuenta destino" value={destinationId} onChange={e=>setDestinationId(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2">{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
    {supportedFx && <label className="block text-sm">Tasa manual BOB por USD<input aria-label="Tasa manual BOB por USD" inputMode="decimal" value={rate} onChange={e=>setRate(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2" /><span className="text-xs text-muted-foreground">Ingresá la cotización acordada. Se enviará con origen Manual, no como tasa de mercado.</span></label>}
    {destinationValue && destinationCurrency && <p className="text-sm">Monto destino calculado: <Amount value={destinationValue} currency={destinationCurrency} size="sm" /></p>}
    {!sameCurrency && !dollarParity && !supportedFx && <p role="alert" className="text-sm text-amber-400">Esta combinación de monedas no está soportada.</p>}
    <label className="block text-sm">Descripción<input aria-label="Descripción" value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2" /></label>
    {error&&<p role="alert" className="text-sm text-rose-400">{error} No se reintentó automáticamente.</p>}
    <div className="flex justify-end gap-2"><button disabled={pending} onClick={onClose} className="rounded border border-border px-3 py-2">Cancelar</button><button disabled={!valid||pending} onClick={submit} className="rounded bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50">{pending?"Guardando…":"Guardar transferencia"}</button></div></div></div>;
}
