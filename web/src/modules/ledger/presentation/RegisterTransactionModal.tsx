"use client";

import React, { useEffect, useState } from "react";
import { AccountDto, RegisterTransactionRequest, TransactionDirection } from "@/modules/ledger/domain/ledger.types";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { SelectField } from "@/shared/ui/select-field";
import { isPositiveDecimal } from "@/shared/lib/money-input";
import { currencyChipLabel, normalizeAmountString } from "@/shared/lib/keypad";
import { NoAccountsNotice } from "@/shared/ui/no-accounts-notice";

interface RegisterTransactionModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  defaultAccountId: string;
  onClose: () => void;
  onSubmit: (req: RegisterTransactionRequest) => Promise<void>;
  onOpenCreateAccount?: () => void;
}

const FORM_ID = "register-transaction-form";

const DIRECTION_OPTIONS = [
  { value: "Expense" as const, label: "Gasto (-)", tone: "expense" as const },
  { value: "Income" as const, label: "Ingreso (+)", tone: "income" as const },
];

export function RegisterTransactionModal({
  isOpen,
  accounts,
  defaultAccountId,
  onClose,
  onSubmit,
  onOpenCreateAccount,
}: RegisterTransactionModalProps) {
  const [accountId, setAccountId] = useState(defaultAccountId || (accounts[0]?.id ?? ""));
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<TransactionDirection>("Expense");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset the form whenever the drawer closes.
  useEffect(() => {
    if (!isOpen) {
      setAccountId("");
      setAmount("");
      setDirection("Expense");
      setDescription("");
    }
  }, [isOpen]);

  const effectiveAccountId = accountId || defaultAccountId || accounts[0]?.id || "";
  const selectedAccount = accounts.find((a) => a.id === effectiveAccountId);
  const normalizedAmount = normalizeAmountString(amount);
  const isValid = isPositiveDecimal(normalizedAmount);
  const amountError =
    amount !== "" && !isValid ? "Ingresá un monto mayor a 0." : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    try {
      await onSubmit({
        accountId: effectiveAccountId,
        amount: normalizedAmount,
        direction,
        description: description.trim() || undefined,
      });
      setAmount("");
      setDescription("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const hasAccounts = accounts.length > 0;

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Registrar movimiento"
      description="Quedará guardado en tu libro mayor inmutable."
      footer={
        hasAccounts ? (
          <>
            <Button
              type="submit"
              form={FORM_ID}
              size="lg"
              loading={submitting}
              disabled={!isValid}
              className="order-1 w-full md:order-2 md:flex-1"
            >
              {submitting ? "Guardando..." : "Confirmar movimiento"}
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
        ) : undefined
      }
    >
      {!hasAccounts ? (
        <NoAccountsNotice
          description="Para registrar ingresos o gastos en el libro mayor inmutable, primero debés registrar tu primera cuenta."
          onOpenCreateAccount={
            onOpenCreateAccount
              ? () => {
                  onClose();
                  onOpenCreateAccount();
                }
              : undefined
          }
        />
      ) : (
        <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
          <SegmentedControl
            aria-label="Tipo de movimiento"
            fullWidth
            options={DIRECTION_OPTIONS}
            value={direction}
            onChange={setDirection}
          />

          <FormField label="Cuenta">
            {(control) => (
              <SelectField
                {...control}
                value={effectiveAccountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                  description: `${a.currency} · Saldo ${a.balance.toFixed(2)}`,
                }))}
              />
            )}
          </FormField>

          <FormField label="Monto" required error={amountError}>
            {(control) => (
              <MoneyInput
                {...control}
                size="lg"
                currency={currencyChipLabel(selectedAccount?.currency)}
                value={amount}
                onValueChange={setAmount}
              />
            )}
          </FormField>

          <FormField label="Descripción" hint="Opcional. Te ayuda a reconocerlo después.">
            {(control) => (
              <Input
                {...control}
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Almuerzo, Taxi, Sueldo"
              />
            )}
          </FormField>
        </form>
      )}
    </ResponsiveDrawer>
  );
}
