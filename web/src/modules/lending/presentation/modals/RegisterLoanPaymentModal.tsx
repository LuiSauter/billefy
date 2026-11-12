"use client";

import React, { useEffect, useRef, useState } from "react";
import Decimal from "decimal.js";
import type { AccountDto } from "@/modules/ledger/domain/ledger.types";
import type { LoanPaymentQuoteDto, LoanSummaryDto, RegisterLoanPaymentRequest } from "../../domain/lending.types";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { FormField, FormGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SelectField } from "@/shared/ui/select-field";
import { Textarea } from "@/shared/ui/textarea";
import { Amount } from "@/shared/ui/amount";

export interface RegisterLoanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanSummaryDto | null;
  accounts: AccountDto[];
  onSubmit: (loanId: string, req: RegisterLoanPaymentRequest) => Promise<unknown>;
  installmentNumber?: number;
  onGetQuote?: (loanId: string, paymentDate?: string) => Promise<LoanPaymentQuoteDto>;
}

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const FORM_ID = "register-loan-payment-form";
function decimal(value: Decimal.Value): Decimal | null {
  try {
    if (value === "") return null;
    const result = new D(value);
    return result.isFinite() && !result.isNegative() ? result : null;
  } catch { return null; }
}
function initialForm(loanId?: string) {
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return { loanId, amount: "", amountEdited: false, account: "", date: localDate, note: "" };
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

interface AllocationPreviewItem {
  number: number;
  totalAllocated: Decimal;
  lateInterest: Decimal;
  regularInterest: Decimal;
  principal: Decimal;
  remainingOnInstallment: Decimal;
  isFullyPaid: boolean;
}

interface PaymentAllocationPreview {
  items: AllocationPreviewItem[];
  earlyPrincipal: Decimal;
  policy: string;
}

function calculateAllocationPreview(
  amount: Decimal,
  installments: LoanPaymentQuoteDto["installments"],
  policy: string,
  remainingPrincipal: Decimal
): PaymentAllocationPreview {
  let rem = amount;
  const items: AllocationPreviewItem[] = [];
  let totalPrincipalPaid = new D(0);

  for (const inst of installments) {
    if (rem.lte(0)) break;
    if (inst.totalOutstanding.lte(0)) continue;

    const late = D.min(rem, inst.outstandingLateInterest);
    rem = rem.minus(late);

    const interest = D.min(rem, inst.outstandingRegularInterest);
    rem = rem.minus(interest);

    const principal = D.min(rem, inst.outstandingPrincipal);
    rem = rem.minus(principal);
    totalPrincipalPaid = totalPrincipalPaid.plus(principal);

    const allocated = late.plus(interest).plus(principal);
    const left = inst.totalOutstanding.minus(allocated);

    items.push({
      number: inst.number,
      totalAllocated: allocated,
      lateInterest: late,
      regularInterest: interest,
      principal,
      remainingOnInstallment: left,
      isFullyPaid: left.isZero(),
    });
  }

  let earlyPrincipal = new D(0);
  if (rem.gt(0) && (policy === "ReduceInstallment" || policy === "ReduceTerm")) {
    earlyPrincipal = D.min(rem, D.max(0, remainingPrincipal.minus(totalPrincipalPaid)));
  }

  return { items, earlyPrincipal, policy };
}

export function RegisterLoanPaymentModal({ isOpen, onClose, loan, accounts, onSubmit, installmentNumber, onGetQuote }: RegisterLoanPaymentModalProps) {
  const [state, setForm] = useState(() => initialForm(loan?.id));
  const [quoteState, setQuote] = useState<{ loanId?: string; date?: string; data?: LoanPaymentQuoteDto; error?: string }>({});
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const session = useRef(0);
  const loanId = loan?.id;
  const loanCurrency = loan?.currency;
  // Never expose another loan's form or quote during a context switch.
  const form = state.loanId === loanId ? state : initialForm(loanId);
  const patch = (values: Partial<typeof form>) => setForm(current => ({ ...(current.loanId === loanId ? current : initialForm(loanId)), ...values }));
  useEffect(() => {
    session.current += 1;
    submitLock.current = false; setSubmitting(false); setError("");
    setForm(initialForm(loanId)); setQuote({});
    return () => { session.current += 1; };
  }, [isOpen, loanId]);

  const paymentDate = form.date;
  useEffect(() => {
    if (!isOpen || !loanId || !onGetQuote || !validDate(paymentDate)) return;
    let active = true;
    setQuote({ loanId, date: paymentDate });
    async function loadQuote() {
      try {
        const data = await onGetQuote!(loanId!, paymentDate);
        if (!active) return;
        if (data.loanId !== loanId || data.currency !== loanCurrency) throw new Error("Quote context mismatch");
        setQuote({ loanId, date: paymentDate, data });
        const selected = installmentNumber === undefined ? undefined : data.installments.find(item => item.number === installmentNumber);
        const prefill = selected?.totalOutstanding ?? (data.suggestedAmount?.gt(0) ? data.suggestedAmount : data.totalPayoff);
        setForm(current => {
          // Automatic defaults follow the date. Typing, clearing or choosing a
          // quick amount takes ownership and must survive every later quote.
          if (current.loanId !== loanId || current.date !== paymentDate || current.amountEdited) return current;
          return { ...current, amount: prefill.toString() };
        });
      } catch {
        if (active) setQuote({ loanId, date: paymentDate, error: "No se pudo consultar el saldo para esta fecha. Revisa la fecha o reintenta." });
      }
    }
    void loadQuote();
    return () => { active = false; };
  }, [isOpen, loanId, loanCurrency, paymentDate, installmentNumber, onGetQuote, quoteAttempt]);

  if (!loan) return null;
  const quoteMatches = quoteState.loanId === loanId && quoteState.date === form.date;
  const quote = quoteMatches ? quoteState.data : undefined;
  const quoteError = quoteMatches ? quoteState.error : undefined;
  const quoteLoading = Boolean(onGetQuote && isOpen && validDate(form.date) && !quote && !quoteError);
  const selectedInstallment = quote?.installments.find(item => item.number === installmentNumber);
  const isCollection = loan.type === "Lent";
  const amountLabel = isCollection ? "Monto cobrado" : "Monto pagado";
  const remaining = decimal(loan.remainingPrincipal);
  const amount = decimal(form.amount);
  const selectedAccount = accounts.find(item => item.id === form.account);
  const amountScale = selectedAccount ? 2 : 6;
  const validAmount = Boolean(amount?.gt(0) && amount.decimalPlaces() <= amountScale
    && amount.decimalPlaces() <= 6 && amount.precision(true) <= 20 && amount.decimalPlaces() <= 6
    && amount.abs().lessThanOrEqualTo(new D("99999999999999.999999")));
  const accountValid = form.account === "none" || Boolean(selectedAccount && selectedAccount.currency === loan.currency);
  const payable = ["Active", "InArrears"].includes(quote?.loanStatus ?? loan.status)
    && (quote ? quote.totalPayoff.gt(0) : Boolean(onGetQuote || (loan.totalPayoff ?? remaining)?.gt(0)));
  const dateValid = validDate(form.date);
  const noteValid = form.note.length <= 500;
  const isValid = payable && validAmount && accountValid && dateValid && noteValid && (!onGetQuote || Boolean(quote));
  const preview = quote && amount && validAmount
    ? calculateAllocationPreview(amount, quote.installments, quote.earlyPaymentPolicy ?? loan.earlyPaymentPolicy ?? "AdvanceInstallments", remaining ?? new D(0))
    : null;
  const title = isCollection ? "Registrar cobro" : "Registrar pago de deuda";
  const close = () => { if (!submitLock.current) onClose(); };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isOpen || !loan || !isValid || submitLock.current) return;
    const activeSession = session.current;
    submitLock.current = true; setSubmitting(true); setError("");
    try {
      await onSubmit(loan.id, { amount: amount!.toString(), accountId: form.account === "none" ? undefined : form.account,
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
        {installmentNumber !== undefined && <p className="text-sm font-medium">Referencia seleccionada: cuota {installmentNumber} · moneda del préstamo: {loan.currency}</p>}
        <p className="text-sm text-muted-foreground">Los pagos se aplican a las cuotas pendientes más antiguas, primero mora, luego intereses y finalmente capital. La cuota seleccionada, si corresponde, no cambia este orden.</p>
        {selectedInstallment && <p className="text-sm">Pendiente de la cuota {selectedInstallment.number}: <Amount value={selectedInstallment.totalOutstanding} currency={loan.currency} size="sm" />.
          {selectedInstallment.outstandingLateInterest.gt(0) && " Incluye intereses de mora."}</p>}
        {quote && <div className="space-y-2">
          <p className="text-sm font-medium">Saldo total para cancelar: <Amount value={quote.totalPayoff} currency={loan.currency} size="sm" /></p>
          <div className="flex flex-wrap gap-2">
            {quote.suggestedAmount?.gt(0) && <Button type="button" size="sm" variant="outline" onClick={() => patch({ amount: quote.suggestedAmount!.toString(), amountEdited: true })}>Cuota sugerida</Button>}
            <Button type="button" size="sm" variant="outline" onClick={() => patch({ amount: quote.totalPayoff.toString(), amountEdited: true })}>Cancelar total</Button>
          </div>
        </div>}
        {quoteLoading && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Consultando saldo para la fecha seleccionada…</p>}
        {quoteError && <div className="space-y-2">
          <p role="alert" className="text-sm text-destructive">{quoteError}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => setQuoteAttempt(current => current + 1)}>Reintentar cotización</Button>
        </div>}
        <FormField htmlFor="payment-amount" label={amountLabel} hint={isCollection ? "Ingresá el monto que recibiste." : "Ingresá el monto que pagaste."} required>{control =>
          <MoneyInput {...control} required aria-invalid={Boolean(form.amount) && !validAmount} aria-describedby={!validAmount && form.amount ? "payment-amount-error" : undefined}
            size="lg" currency={loan.currency}
            value={form.amount} onValueChange={amount => patch({ amount, amountEdited: true })} />}</FormField>
        {form.amount && !validAmount && <p id="payment-amount-error" role="alert" className="text-sm text-destructive">Ingresá un monto positivo de hasta {amountScale} decimales y dentro de la precisión permitida.</p>}
        <FormGrid>
          <FormField htmlFor="payment-account" label={isCollection ? "Cuenta de destino" : "Cuenta de origen"} hint="Sin movimiento en cuenta no cambiará el saldo de tus cuentas." required>{control =>
            <SelectField {...control} required aria-invalid={!accountValid && Boolean(form.account)} value={form.account} onChange={e => patch({ account: e.target.value })}
              options={[{ value: "", label: "Seleccioná una opción" }, { value: "none", label: "(Sin movimiento en cuenta bancaria)" }, ...accounts.filter(item => item.currency === loan.currency)
                .map(item => ({ value: item.id, label: item.name }))]} />}</FormField>
          {!accountValid && form.account && <p role="alert" className="text-sm text-destructive">Elegí una cuenta en la moneda del préstamo o Sin movimiento en cuenta.</p>}
          <FormField htmlFor="payment-date" label={isCollection ? "Fecha del cobro" : "Fecha del pago"} required>{control =>
            <Input {...control} required aria-invalid={!dateValid} type="date" value={form.date} onChange={e => patch({ date: e.target.value })} />}</FormField>
          {!dateValid && <p role="alert" className="text-sm text-destructive">Ingresá una fecha válida.</p>}
        </FormGrid>
        <FormField htmlFor="payment-note" label="Nota" hint="Opcional. Referencia o comprobante del pago.">{control =>
          <Textarea {...control} rows={2} maxLength={500} aria-invalid={!noteValid} value={form.note} onChange={e => patch({ note: e.target.value })} />}</FormField>
        {!noteValid && <p role="alert" className="text-sm text-destructive">La nota no puede superar los 500 caracteres.</p>}
      </fieldset>
      <Card className="space-y-3 p-4" aria-live="polite">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">{isCollection ? "Resumen del cobro" : "Resumen del pago"}</h3>
          {quote?.earlyPaymentPolicy && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border border-border">
              {quote.earlyPaymentPolicy === "ReduceInstallment"
                ? "Abono a capital (reducir cuota)"
                : quote.earlyPaymentPolicy === "ReduceTerm"
                ? "Abono a capital (reducir plazo)"
                : "Adelanto de cuotas"}
            </span>
          )}
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><dt>Capital pendiente</dt><dd>{remaining ? <Amount value={remaining} currency={loan.currency} size="sm" /> : "—"}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>{amountLabel}</dt><dd>{amount ? <Amount value={amount} currency={loan.currency} size="sm" /> : "Ingresá el monto"}</dd></div>
        </dl>
        {preview && preview.items.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border text-xs">
            <span className="font-semibold text-foreground block">Distribución prevista del monto:</span>
            <div className="space-y-1.5">
              {preview.items.map((item) => (
                <div key={item.number} className="flex flex-col gap-0.5 p-2 rounded-lg bg-muted/40 border border-border/50">
                  <div className="flex justify-between items-center font-medium">
                    <span>
                      Cuota {item.number}:{" "}
                      <span className={item.isFullyPaid ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                        {item.isFullyPaid ? "Cancelada 100%" : <>Abono parcial · Falta <Amount value={item.remainingOnInstallment} currency={loan.currency} size="xs" /></>}
                      </span>
                    </span>
                    <Amount value={item.totalAllocated} currency={loan.currency} size="sm" />
                  </div>
                  <div className="flex gap-2 text-[11px] text-muted-foreground font-mono">
                    {item.lateInterest.gt(0) && <span>Mora: <Amount value={item.lateInterest} currency={loan.currency} size="xs" /></span>}
                    {item.regularInterest.gt(0) && <span>Int: <Amount value={item.regularInterest} currency={loan.currency} size="xs" /></span>}
                    <span>Cap: <Amount value={item.principal} currency={loan.currency} size="xs" /></span>
                  </div>
                </div>
              ))}
              {preview.earlyPrincipal.gt(0) && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <div className="flex justify-between font-bold">
                    <span>Abono directo a capital vivo</span>
                    <Amount value={preview.earlyPrincipal} currency={loan.currency} size="sm" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {preview.policy === "ReduceInstallment"
                      ? "Se recalcularán las siguientes cuotas mensuales a un monto menor manteniendo el plazo original."
                      : "Se reducirá el plazo del préstamo, cancelando las últimas cuotas antes de tiempo."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">El capital pendiente no es una cotización de cancelación. El servidor determina la distribución y el saldo actualizado.</p>
      </Card>
      {!payable && <p role="status" className="text-sm text-muted-foreground">Este préstamo no tiene saldo pendiente o no admite pagos en su estado actual.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  </ResponsiveDrawer>;
}
