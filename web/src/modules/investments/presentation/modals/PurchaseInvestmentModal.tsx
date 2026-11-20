"use client";

import React, { useEffect, useRef, useState } from "react";
import Decimal from "decimal.js";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { normalizeAmountString } from "@/shared/lib/keypad";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { FormField } from "@/shared/ui/form-field";
import { MoneyInput } from "@/shared/ui/money-input";
import { Input } from "@/shared/ui/input";
import { SelectField } from "@/shared/ui/select-field";
import { Button } from "@/shared/ui/button";
import { Amount } from "@/shared/ui/amount";
import { Investment, InvestmentPurchaseInput } from "../../domain/investment.types";

interface Props {
  investment: Investment | null;
  accounts: AccountDto[];
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (id: string, input: InvestmentPurchaseInput, key: string) => Promise<unknown>;
}
const FORM_ID = "purchase-investment-form";
const today = () => new Date().toISOString().slice(0, 10);
function decimal(raw: string): Decimal {
  const value = normalizeAmountString(raw.trim().replace(",", "."));
  return /^\d+(?:\.\d+)?$/.test(value) ? new Decimal(value) : new Decimal(NaN);
}

export function PurchaseInvestmentModal({ investment, accounts, isOpen, onClose, onPurchase }: Props) {
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("0");
  const [account, setAccount] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const attempt = useRef<{ id: string; name: string; currency: string; input: InvestmentPurchaseInput; key: string } | null>(null);
  useEffect(() => {
    if (!isOpen || attempt.current) return;
    setQuantity(""); setPrice(""); setFees("0"); setAccount(""); setNotes(""); setDate(today()); setError("");
  }, [isOpen, investment?.id]);
  if (!isOpen || !investment) return null;
  // An uncertain attempt remains bound to its original asset even if the caller changes selection.
  const currency = attempt.current?.currency ?? investment.currency;
  const name = attempt.current?.name ?? investment.name;
  const precision = currency === "BTC" ? 8 : 2;
  // The public account list already excludes archived accounts.
  const eligible = accounts.filter(a => a.currency === currency);
  const q = decimal(quantity), p = decimal(price), f = decimal(fees);
  const gross = q.times(p).toDecimalPlaces(precision, Decimal.ROUND_HALF_UP);
  const debit = gross.plus(f);
  const valid = q.isFinite() && q.gt(0) && q.decimalPlaces() <= 10 && p.isFinite() && p.gt(0) && p.decimalPlaces() <= 6 &&
    f.isFinite() && f.gte(0) && f.decimalPlaces() <= Math.min(precision, 6) && gross.gt(0) && gross.decimalPlaces() <= 6 &&
    eligible.some(a => a.id === account) && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00.000Z`)) && notes.length <= 500;
  const frozen = pending || attempt.current !== null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if ((!valid && !attempt.current) || lock.current) return;
    lock.current = true;
    setPending(true); setError("");
    attempt.current ??= {
      id: investment.id, name: investment.name, currency: investment.currency, key: crypto.randomUUID(), input: {
        quantity: q.toFixed(), unitPrice: p.toFixed(), totalAmount: gross.toFixed(), fees: f.toFixed(), linkedAccountId: account,
        occurredAt: new Date(`${date}T00:00:00.000Z`).toISOString(), ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
    };
    try {
      await onPurchase(attempt.current.id, attempt.current.input, attempt.current.key);
      attempt.current = null;
      setQuantity(""); setPrice(""); setAccount("");
      onClose();
    } catch (reason) {
      setError(`${reason instanceof Error ? reason.message : "No se pudo confirmar la compra."} Reintentar conserva los mismos datos y evita duplicados.`);
    } finally { lock.current = false; setPending(false); }
  };
  return (
    <ResponsiveDrawer open={isOpen} onOpenChange={open => !open && !pending && onClose()}
      title="Comprar inversión" description={`${name} · No es un gasto de consumo. Se intercambia efectivo por unidades y costo histórico.`} size="md"
      footer={<div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cerrar</Button>
        <Button type="submit" form={FORM_ID} loading={pending} disabled={pending || (!valid && !attempt.current)}>{attempt.current ? "Reintentar compra" : "Confirmar compra"}</Button>
      </div>}>
      <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-4 py-2">
        <FormField label="Cuenta de origen" required>{control => <SelectField {...control} required value={account} disabled={frozen}
          onChange={e => setAccount(e.target.value)} options={[{ value: "", label: `Selecciona una cuenta en ${currency}` }, ...eligible.map(a => ({ value: a.id, label: a.name }))]} />}</FormField>
        {eligible.length === 0 && <p role="status" className="text-sm text-muted-foreground">Necesitas una cuenta de efectivo en {currency}. Esta compra no realiza conversión de moneda.</p>}
        <FormField label="Cantidad comprada" required>{control => <Input {...control} inputMode="decimal" required value={quantity} disabled={frozen} onChange={e => setQuantity(e.target.value)} />}</FormField>
        <FormField label="Precio por unidad" required>{control => <MoneyInput {...control} currency={currency} maxDecimals={6} value={price} disabled={frozen} onValueChange={setPrice} />}</FormField>
        <FormField label="Comisiones" hint="Se suman al efectivo pagado y al costo de adquisición.">{control => <MoneyInput {...control} currency={currency} maxDecimals={precision} value={fees} disabled={frozen} onValueChange={setFees} />}</FormField>
        <FormField label="Fecha de compra" required>{control => <Input {...control} type="date" required value={date} disabled={frozen} onChange={e => setDate(e.target.value)} />}</FormField>
        <FormField label="Notas" hint="Opcional">{control => <Input {...control} maxLength={500} value={notes} disabled={frozen} onChange={e => setNotes(e.target.value)} />}</FormField>
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">Total a pagar: <Amount value={debit.isFinite() ? debit.toFixed() : "0"} currency={currency} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>
    </ResponsiveDrawer>
  );
}
