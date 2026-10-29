"use client";

import React, { useEffect, useState } from "react";
import { AccountType, CreateAccountRequest } from "@/modules/ledger/domain/ledger.types";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { SelectField } from "@/shared/ui/select-field";
import { currencyChipLabel, normalizeAmountString } from "@/shared/lib/keypad";

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: CreateAccountRequest) => Promise<void>;
}

const FORM_ID = "create-account-form";

const TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "Bank", label: "Banco" },
  { value: "Wallet", label: "Billetera Digital" },
  { value: "Cash", label: "Efectivo" },
  { value: "Exchange", label: "Exchange (Crypto)" },
];

const CURRENCY_OPTIONS = [
  { value: "BOB", label: "BOB" },
  { value: "USD", label: "USD" },
  { value: "USDT", label: "USDT" },
];

const CURRENCY_NAMES: Record<string, string> = {
  BOB: "Bolivianos",
  USD: "Dólares",
  USDT: "Tether",
};

export function CreateAccountModal({ isOpen, onClose, onSubmit }: CreateAccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("Bank");
  const [currency, setCurrency] = useState("BOB");
  const [initialBalance, setInitialBalance] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset the form whenever the drawer closes.
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setType("Bank");
      setCurrency("BOB");
      setInitialBalance("");
    }
  }, [isOpen]);

  const isValid = name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const balance = normalizeAmountString(initialBalance.trim());

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        currency,
        initialBalance: balance ? balance : 0,
      });
      setName("");
      setInitialBalance("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Crear nueva cuenta"
      description="Elegí el tipo, la moneda y con cuánto arranca."
      footer={
        <>
          <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            loading={submitting}
            disabled={!isValid}
            className="order-1 w-full md:order-2 md:flex-1"
          >
            {submitting ? "Creando..." : "Crear cuenta"}
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
        <FormField label="Nombre de la cuenta" required>
          {(control) => (
            <Input
              {...control}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Banco Unión, Billetera USDT, Efectivo"
              autoComplete="off"
            />
          )}
        </FormField>

        <FormField label="Tipo de cuenta">
          {(control) => (
            <SelectField
              {...control}
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              options={TYPE_OPTIONS}
            />
          )}
        </FormField>

        <FormField label="Moneda" hint={`${CURRENCY_NAMES[currency] ?? currency} (${currency})`}>
          <SegmentedControl
            aria-label="Moneda"
            fullWidth
            options={CURRENCY_OPTIONS}
            value={currency}
            onChange={setCurrency}
          />
        </FormField>

        <FormField label="Saldo inicial" hint="Opcional. Si lo dejás vacío, la cuenta arranca en 0.">
          {(control) => (
            <MoneyInput
              {...control}
              currency={currencyChipLabel(currency)}
              value={initialBalance}
              onValueChange={setInitialBalance}
            />
          )}
        </FormField>
      </form>
    </ResponsiveDrawer>
  );
}
