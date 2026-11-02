"use client";

import React, { useState, useEffect } from "react";
import Decimal from "decimal.js";
import { ArrowRight, Timer } from "lucide-react";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { Button } from "@/shared/ui/button";
import { FormField, FormGrid } from "@/shared/ui/form-field";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SelectField } from "@/shared/ui/select-field";
import { notify } from "@/shared/lib/notify";
import { currencyChipLabel } from "@/shared/lib/keypad";
import { NoAccountsNotice } from "@/shared/ui/no-accounts-notice";

interface FxTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountDto[];
  p2pRate: number;
  onConfirmTransfer: (data: {
    fromAccountId: string;
    toAccountId: string;
    amount: string;
    description: string;
  }) => Promise<void>;
  onOpenCreateAccount?: () => void;
}

const FORM_ID = "fx-transfer-form";
const RATE_FREEZE_SECONDS = 45;

export function FxTransferModal({
  isOpen,
  onClose,
  accounts,
  p2pRate,
  onConfirmTransfer,
  onOpenCreateAccount,
}: FxTransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RATE_FREEZE_SECONDS);
  const [loading, setLoading] = useState(false);

  // Initialize accounts default when available
  useEffect(() => {
    if (accounts.length >= 2) {
      if (!fromAccountId || !accounts.some((a) => a.id === fromAccountId)) {
        const bobAcc = accounts.find((a) => a.currency === "BOB") || accounts[0];
        setFromAccountId(bobAcc.id);
      }
      if (!toAccountId || !accounts.some((a) => a.id === toAccountId)) {
        const usdAcc =
          accounts.find((a) => (a.currency === "USDT" || a.currency === "USD") && a.id !== accounts[0].id) ||
          accounts[1] ||
          accounts[0];
        setToAccountId(usdAcc.id);
      }
    }
  }, [accounts, fromAccountId, toAccountId]);

  // Countdown timer for rate freeze (45s loop); form resets when the drawer closes.
  useEffect(() => {
    if (!isOpen) {
      setAmountStr("");
      setSecondsLeft(RATE_FREEZE_SECONDS);
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? RATE_FREEZE_SECONDS : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const needsMoreAccounts = accounts.length < 2;

  const fromAccount = accounts.find((a) => a.id === fromAccountId) || accounts[0];
  const toAccount = accounts.find((a) => a.id === toAccountId) || accounts[1];

  const amountDecimal = new Decimal(amountStr || "0");
  const rateDecimal = new Decimal(p2pRate > 0 ? p2pRate : 9.85);

  let targetAmountDecimal = new Decimal(0);
  if (fromAccount?.currency === "BOB" && (toAccount?.currency === "USD" || toAccount?.currency === "USDT")) {
    targetAmountDecimal = rateDecimal.gt(0) ? amountDecimal.div(rateDecimal) : new Decimal(0);
  } else if ((fromAccount?.currency === "USD" || fromAccount?.currency === "USDT") && toAccount?.currency === "BOB") {
    targetAmountDecimal = amountDecimal.times(rateDecimal);
  } else {
    targetAmountDecimal = amountDecimal;
  }

  const sameAccountError =
    fromAccountId && toAccountId && fromAccountId === toAccountId
      ? "La cuenta de origen y destino deben ser distintas."
      : undefined;
  const accountsResolve =
    accounts.some((account) => account.id === fromAccountId) &&
    accounts.some((account) => account.id === toAccountId);
  const isInsufficientFunds = Boolean(
    amountDecimal.gt(0) && fromAccount && amountDecimal.gt(new Decimal(fromAccount.balance.toString()))
  );
  const isValid = amountDecimal.gt(0) && accountsResolve && !sameAccountError && !isInsufficientFunds;
  const amountError =
    amountStr !== "" && !amountDecimal.gt(0)
      ? "Ingresá un monto mayor a 0."
      : isInsufficientFunds
      ? "El saldo de la cuenta de origen es insuficiente."
      : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isInsufficientFunds) return;

    try {
      setLoading(true);
      await onConfirmTransfer({
        fromAccountId,
        toAccountId,
        amount: amountStr,
        description: `Conversión FX ${fromAccount?.currency} ➔ ${toAccount?.currency} (Tasa P2P ${p2pRate.toFixed(2)})`,
      });
      setAmountStr("");
      onClose();
    } catch (err: unknown) {
      notify.error("Error al procesar transferencia FX", err);
    } finally {
      setLoading(false);
    }
  };

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    description: `${a.currency} · Saldo ${a.balance.toFixed(2)}`,
  }));

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={needsMoreAccounts ? "Transferencia entre cuentas" : "Transferencia entre cuentas y conversión FX"}
      description="Se convierte con la tasa P2P congelada por unos segundos."
      footer={
        needsMoreAccounts ? undefined : (
          <>
            <Button
              type="submit"
              form={FORM_ID}
              size="lg"
              loading={loading}
              disabled={!isValid}
              className="order-1 w-full md:order-2 md:flex-1"
            >
              Confirmar transferencia
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
        )
      }
    >
      {needsMoreAccounts ? (
        <NoAccountsNotice
          title={accounts.length === 0 ? "No tenés cuentas registradas" : "Necesitás al menos 2 cuentas"}
          description={
            accounts.length === 0
              ? "Para transferir o convertir divisas en tiempo real, primero debés registrar al menos dos cuentas en el sistema."
              : "Para realizar una transferencia entre cuentas, necesitás tener registrada una cuenta de origen y otra de destino."
          }
          ctaLabel={accounts.length === 0 ? "Crear Primera Cuenta" : "Crear Segunda Cuenta"}
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
          <FormGrid>
            <FormField label="Cuenta origen">
              {(control) => (
                <SelectField
                  {...control}
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  options={accountOptions}
                />
              )}
            </FormField>
            <FormField label="Cuenta destino" error={sameAccountError}>
              {(control) => (
                <SelectField
                  {...control}
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  options={accountOptions}
                />
              )}
            </FormField>
          </FormGrid>

          {/* Conversion row (OpenPencil n2560): from (slate) -> to (emerald tint) */}
          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted p-4">
              <span className="text-xs font-semibold text-muted-foreground">
                Desde: {fromAccount?.name || "Cuenta origen"}
              </span>
              <FormField label="Monto a convertir" required error={amountError}>
                {(control) => (
                  <MoneyInput
                    {...control}
                    size="lg"
                    currency={currencyChipLabel(fromAccount?.currency)}
                    value={amountStr}
                    onValueChange={setAmountStr}
                  />
                )}
              </FormField>
              <span className="text-xs font-semibold text-muted-foreground">
                {fromAccount?.currency === "BOB" ? "BOB (Bolivianos)" : fromAccount?.currency}
              </span>
            </div>

            <div aria-hidden="true" className="flex justify-center">
              <ArrowRight className="size-5 rotate-90 text-primary md:rotate-0" />
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-success/30 bg-success/10 p-4">
              <span className="text-xs font-semibold text-foreground">
                Hacia: {toAccount?.name || "Cuenta destino"}
              </span>
              <div
                aria-live="polite"
                aria-label="Monto que recibirás"
                className="text-3xl font-bold text-success tabular-nums"
              >
                + {targetAmountDecimal.toFixed(2)}
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {toAccount?.currency === "USDT" ? "USDT (Cripto)" : toAccount?.currency}
              </span>
            </div>
          </div>

          {/* Rate snapshot pill (OpenPencil RPill) */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-accent px-4 py-3">
            <span className="text-sm font-semibold text-accent-foreground">
              Tasa snapshot: 1 USDT = Bs. {p2pRate.toFixed(2)} (Binance P2P Buy)
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary tabular-nums">
              <Timer className="size-4" aria-hidden="true" />
              Congelada {secondsLeft}s
            </span>
          </div>
        </form>
      )}
    </ResponsiveDrawer>
  );
}
