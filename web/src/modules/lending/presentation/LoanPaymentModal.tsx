"use client";

import React, { useState } from "react";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { RegisterLoanPaymentRequest } from "@/modules/lending/domain/lending.types";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SelectField } from "@/shared/ui/select-field";

interface LoanPaymentModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  onClose: () => void;
  onSubmit: (req: RegisterLoanPaymentRequest) => Promise<void>;
}

const FORM_ID = "loan-payment-form";

export function LoanPaymentModal({
  isOpen,
  accounts,
  onClose,
  onSubmit,
}: LoanPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    try {
      await onSubmit({
        amount: parsedAmount,
        accountId: accountId || undefined,
        note: note.trim() || undefined,
      });
      setAmount("");
      setNote("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title="Registrar pago a préstamo"
      description="Imputación en cascada estricta: Mora → Interés → Capital."
      footer={
        <>
          <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            variant="success"
            loading={submitting}
            disabled={!isValid}
            className="order-1 w-full md:order-2 md:flex-1"
          >
            {submitting ? "Aplicando..." : "Confirmar pago"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="order-2 w-full md:order-1 md:w-auto md:border-input md:bg-card"
          >
            Cancelar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="p-3.5 rounded-2xl bg-muted/60 border border-border text-xs text-muted-foreground leading-relaxed">
          El pago cubre las cuotas más antiguas primero según las reglas de amortización del motor financiero.
        </div>

        <FormField label="Monto pagado" required>
          {(control) => (
            <MoneyInput
              {...control}
              size="lg"
              currency="Bs"
              value={amount}
              onValueChange={setAmount}
            />
          )}
        </FormField>

        <FormField
          label="Imputar en cuenta del libro mayor"
          hint="Opcional. Registra el egreso o ingreso en tu saldo bancario."
        >
          {(control) => (
            <SelectField
              {...control}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={[
                { value: "", label: "(Sin movimiento en cuenta bancaria)" },
                ...accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                  description: `${a.currency} · Saldo ${a.balance.toFixed(2)}`,
                })),
              ]}
            />
          )}
        </FormField>

        <FormField label="Nota del pago" hint="Opcional. Identificador o comprobante de la transferencia.">
          {(control) => (
            <Input
              {...control}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Pago cuota 1 en efectivo o transferencia"
            />
          )}
        </FormField>
      </form>
    </ResponsiveDrawer>
  );
}
