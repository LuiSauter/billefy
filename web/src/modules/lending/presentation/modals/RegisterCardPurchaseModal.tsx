"use client";

import React, { useEffect, useRef, useState } from "react";
import Decimal from "decimal.js";
import type { LoanSummaryDto, RegisterCardPurchaseRequest } from "../../domain/lending.types";
import { CategoryPickerField } from "@/modules/ledger/presentation/CategoryPickerField";
import { CategoryCreatorView } from "@/modules/ledger/presentation/CategoryCreatorView";
import { Button } from "@/shared/ui/button";
import { FormField, FormGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Textarea } from "@/shared/ui/textarea";

export interface RegisterCardPurchaseModalProps {
  isOpen: boolean;
  loan: LoanSummaryDto | null;
  onClose: () => void;
  onSubmit: (loanId: string, request: RegisterCardPurchaseRequest) => Promise<unknown>;
}
const initial = (loanId?: string) => ({ loanId, amount: "", categoryId: "", date: new Date().toISOString().slice(0, 10), description: "" });
export function RegisterCardPurchaseModal({ isOpen, loan, onClose, onSubmit }: RegisterCardPurchaseModalProps) {
  const [state, setState] = useState(() => initial(loan?.id));
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryValid, setCategoryValid] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const session = useRef(0);
  const loanId = loan?.id;
  const form = state.loanId === loanId ? state : initial(loanId);
  const patch = (values: Partial<typeof form>) => setState(current => ({ ...(current.loanId === loanId ? current : initial(loanId)), ...values }));
  useEffect(() => {
    session.current += 1; lock.current = false; setPending(false); setError("");
    setState(initial(loanId)); setCreatingCategory(false);
    return () => { session.current += 1; };
  }, [isOpen, loanId]);
  if (!isOpen || !loan) return null;
  let amountValid = false;
  try { const amount = new Decimal(form.amount); amountValid = amount.isFinite() && amount.gt(0) && amount.decimalPlaces() <= 2 && amount.lte("99999999999999.99"); } catch { /* Invalid input stays editable. */ }
  const parsedDate = new Date(`${form.date}T00:00:00Z`);
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(form.date) && Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === form.date;
  const valid = loan.loanKind === "CreditCard" && ["Active", "InArrears", "Paid"].includes(loan.status)
    && amountValid && dateValid && Boolean(form.categoryId) && form.description.length <= 500;
  const close = () => { if (!lock.current) onClose(); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || lock.current) return;
    const activeSession = session.current;
    lock.current = true; setPending(true); setError("");
    try {
      await onSubmit(loan.id, { amount: new Decimal(form.amount).toFixed(2), currency: loan.currency,
        categoryId: form.categoryId, occurredAt: `${form.date}T00:00:00Z`, description: form.description.trim() || undefined });
      if (session.current === activeSession) { setPending(false); onClose(); }
    } catch {
      if (session.current === activeSession) {
        lock.current = false; setPending(false);
        setError("No se pudo confirmar la compra. Tus datos se conservaron; reintenta sin cambiarlos para reutilizar la misma operación.");
      }
    }
  };
  return <ResponsiveDrawer open={isOpen} onOpenChange={open => { if (!open) close(); }} size="md"
    title={creatingCategory ? "Crear categoría" : "Registrar compra con tarjeta"}
    description={`${loan.counterpartyName} · ${loan.currency}. La compra reconoce gasto y deuda, sin retirar efectivo.`}
    footer={creatingCategory ? <><Button type="button" variant="outline" onClick={() => setCreatingCategory(false)}>Volver</Button>
      <Button type="submit" form="card-purchase-category" disabled={!categoryValid}>Crear categoría</Button></> : <>
      <Button type="button" variant="outline" disabled={pending} onClick={close}>Cancelar</Button>
      <Button type="submit" form="card-purchase-form" loading={pending} disabled={pending || !valid}>Registrar compra</Button></>}>
    {creatingCategory ? <CategoryCreatorView formId="card-purchase-category" direction="Expense" onCancel={() => setCreatingCategory(false)}
      onValidityChange={setCategoryValid} onCreated={category => { patch({ categoryId: category.id }); setCreatingCategory(false); }} /> :
      <form id="card-purchase-form" onSubmit={submit} className="space-y-4" aria-busy={pending}>
        <fieldset disabled={pending} className="min-w-0 space-y-4">
          <FormGrid>
            <FormField htmlFor="card-purchase-amount" label="Monto de la compra" required>{control =>
              <MoneyInput {...control} required currency={loan.currency} value={form.amount} onValueChange={amount => patch({ amount })} />}</FormField>
            <FormField htmlFor="card-purchase-date" label="Fecha de compra" required>{control =>
              <Input {...control} type="date" required value={form.date} onChange={event => patch({ date: event.target.value })} />}</FormField>
          </FormGrid>
          <CategoryPickerField direction="Expense" selectedCategoryId={form.categoryId} onSelectCategory={category => patch({ categoryId: category?.id ?? "" })}
            onRequestCreateCategory={() => setCreatingCategory(true)} />
          <FormField htmlFor="card-purchase-description" label="Descripción">{control =>
            <Textarea {...control} maxLength={500} value={form.description} onChange={event => patch({ description: event.target.value })} />}</FormField>
          <p className="text-sm text-muted-foreground">El pago posterior de capital reduce esta deuda; no vuelve a consumir el presupuesto.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </fieldset>
      </form>}
  </ResponsiveDrawer>;
}
