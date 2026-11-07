"use client";

import React, { useEffect, useRef, useState } from "react";
import Decimal from "decimal.js";
import type { AccountDto } from "@/modules/ledger/domain/ledger.types";
import type { LoanSummaryDto, RegisterLoanPaymentRequest } from "../../domain/lending.types";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { FormField, FormGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SelectField } from "@/shared/ui/select-field";
import { Textarea } from "@/shared/ui/textarea";

export interface RegisterLoanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanSummaryDto | null;
  accounts: AccountDto[];
  onSubmit: (loanId: string, req: RegisterLoanPaymentRequest) => Promise<unknown>;
}

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const FORM_ID = "register-loan-payment-form";
function decimal(value: Decimal.Value): Decimal | null {
  try {
    if (value === "") return null;
    const result = new D(value);
    return result.isFinite() && !result.isNegative() && Number.isFinite(result.toNumber()) ? result : null;
  } catch { return null; }
}
function initialForm(loan: LoanSummaryDto | null) {
  // The summary DTO does not contain the next installment. Use actual remaining
  // principal rather than inventing a "typical" installment from original terms.
  return { loanId: loan?.id, amount: loan ? decimal(loan.remainingPrincipal)?.toFixed(2) ?? "" : "", account: "",
    date: new Date().toISOString().slice(0, 10), note: "" };
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function money(value: Decimal.Value, currency: string) {
  return `${new D(value).toFixed(2).replace(".", ",")} ${currency}`;
}

export function RegisterLoanPaymentModal({ isOpen, onClose, loan, accounts, onSubmit }: RegisterLoanPaymentModalProps) {
  const [state, setForm] = useState(() => initialForm(loan));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const session = useRef(0);
  const loanId = loan?.id;
  // Do not expose the previous loan's amount/account even on the render before
  // the loan-change effect commits.
  const form = state.loanId === loanId ? state : initialForm(loan);
  const patch = (values: Partial<typeof form>) => setForm(current => ({ ...(current.loanId === loanId ? current : initialForm(loan)), ...values }));
  useEffect(() => {
    session.current += 1;
    submitLock.current = false; setSubmitting(false); setError("");
    setForm(current => ({ ...current, loanId: undefined }));
    // Invalidate the form on close or loan change; the next render initializes
    // it from the current summary without resetting in-progress user edits.
    return () => { session.current += 1; };
  }, [isOpen, loanId]);

  if (!loan) return null;
  const remaining = decimal(loan.remainingPrincipal);
  const amount = decimal(form.amount);
  const validAmount = Boolean(amount?.gt(0) && amount.decimalPlaces() <= 2);
  const accountValid = form.account === "" || accounts.some(item => item.id === form.account && item.currency === loan.currency);
  const payable = ["Active", "InArrears"].includes(loan.status) && Boolean(remaining?.gt(0));
  const isValid = payable && validAmount && accountValid && validDate(form.date) && form.note.length <= 500;
  // This is a principal-only estimate, not an allocation result. The server
  // first covers late interest and interest, and alone validates total debt.
  const after = remaining && amount ? D.max(0, remaining.minus(amount)) : null;
  const title = loan.type === "Lent" ? "Registrar cobro" : "Registrar pago de deuda";
  const close = () => { if (!submitLock.current) onClose(); };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isOpen || !loan || !isValid || submitLock.current) return;
    const activeSession = session.current;
    submitLock.current = true; setSubmitting(true); setError("");
    try {
      await onSubmit(loan.id, { amount: amount!.toNumber(), accountId: form.account || undefined,
        paymentDate: form.date, note: form.note.trim() || undefined });
    } catch {
      if (session.current === activeSession) {
        setError("No se pudo registrar el pago. Tus datos se conservaron; inténtalo de nuevo.");
        submitLock.current = false; setSubmitting(false);
      }
      return;
    }
    // Keep the success lock until close. Ignore completions from a prior loan.
    if (session.current === activeSession) { setSubmitting(false); onClose(); }
  }

  return <ResponsiveDrawer open={isOpen} onOpenChange={open => { if (!open) close(); }} size="md" title={title}
    description={`${loan.counterpartyName} · ${loan.currency}`}
    footer={<>
      <Button type="button" variant="outline" disabled={submitting} onClick={close}>Cancelar</Button>
      <Button type="submit" form={FORM_ID} disabled={!isValid || submitting} loading={submitting}>{title}</Button>
    </>}>
    <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5" aria-busy={submitting}>
      <fieldset disabled={submitting || !payable} className="min-w-0 space-y-5">
        <FormField htmlFor="payment-amount" label={loan.type === "Lent" ? "Monto cobrado" : "Monto pagado"} required>{control =>
          <MoneyInput {...control} required size="lg" currency={loan.currency === "BOB" ? "Bs" : loan.currency === "USD" ? "$" : loan.currency}
            value={form.amount} onValueChange={amount => patch({ amount })} />}</FormField>
        <FormGrid>
          <FormField htmlFor="payment-account" label="Cuenta" hint="Opcional. Registra el ingreso o egreso en una cuenta de la misma moneda.">{control =>
            <SelectField {...control} value={form.account} onChange={e => patch({ account: e.target.value })}
              options={[{ value: "", label: "Sin movimiento en cuenta" }, ...accounts.filter(item => item.currency === loan.currency)
                .map(item => ({ value: item.id, label: item.name }))]} />}</FormField>
          <FormField htmlFor="payment-date" label="Fecha del pago" required>{control =>
            <Input {...control} required type="date" value={form.date} onChange={e => patch({ date: e.target.value })} />}</FormField>
        </FormGrid>
        <FormField htmlFor="payment-note" label="Nota" hint="Opcional. Referencia o comprobante del pago.">{control =>
          <Textarea {...control} rows={2} maxLength={500} value={form.note} onChange={e => patch({ note: e.target.value })} />}</FormField>
      </fieldset>
      <Card className="space-y-3 p-4" aria-live="polite">
        <h3 className="text-sm font-bold">Resumen del saldo</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><dt>Capital restante antes</dt><dd className="font-semibold tabular-nums">{remaining ? money(remaining, loan.currency) : "—"}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Capital restante después (estimado)</dt><dd className="font-semibold tabular-nums">{after ? money(after, loan.currency) : "—"}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">Estimación si todo el pago se aplica a capital. El servidor aplica mora e intereses primero y valida el saldo total; el capital restante real puede ser mayor.</p>
      </Card>
      {!payable && <p role="status" className="text-sm text-muted-foreground">Este préstamo no tiene capital pendiente o no admite pagos en su estado actual.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  </ResponsiveDrawer>;
}
