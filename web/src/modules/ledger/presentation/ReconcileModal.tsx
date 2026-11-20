"use client";

import { useState, useEffect } from "react";
import Decimal from "decimal.js";
import { ArrowDownRight, ArrowUpRight, Equal } from "lucide-react";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { sanitizeDecimalInput } from "@/shared/lib/money-input";
import { Amount } from "@/shared/ui/amount";

interface ReconcileModalProps {
  isOpen: boolean;
  account: AccountDto | null;
  onClose: () => void;
  onSubmit: (accountId: string, realBalance: number, notes?: string) => Promise<void>;
}

const FORM_ID = "reconcile-form";

/** Like `sanitizeDecimalInput`, but keeps a leading "-" (real balances can be negative). */
function sanitizeSignedDecimal(raw: string): string {
  const negative = raw.trimStart().startsWith("-");
  const digits = sanitizeDecimalInput(raw.replace(/-/g, ""));
  return negative ? `-${digits}` : digits;
}

export function ReconcileModal({ isOpen, account, onClose, onSubmit }: ReconcileModalProps) {
  const [realBalance, setRealBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Prefill with the ledger balance on open; reset again when the drawer closes.
  useEffect(() => {
    if (account) {
      setRealBalance(account.balance.toString());
      setNotes("");
    }
  }, [account, isOpen]);

  if (!account) return null;

  const isValid = /^-?\d+\.?\d*$/.test(realBalance);
  const realNum = parseFloat(realBalance); // API contract requires a number

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    try {
      await onSubmit(account.id, realNum, notes.trim() || undefined);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const diff = isValid ? new Decimal(realBalance).minus(account.balance) : new Decimal(0);
  const isPositive = diff.gt(0);
  const isNegative = diff.lt(0);

  const tone = isPositive
    ? {
        box: "bg-success/10 border-success/30",
        value: "text-success",
        icon: "bg-success/15 text-success",
        Icon: ArrowUpRight,
        hint: "Se registrará un ajuste a favor (ingreso)",
      }
    : isNegative
      ? {
          box: "bg-destructive/10 border-destructive/30",
          value: "text-destructive",
          icon: "bg-destructive/15 text-destructive",
          Icon: ArrowDownRight,
          hint: "Se registrará un ajuste en contra (egreso)",
        }
      : {
          box: "bg-muted border-border",
          value: "text-muted-foreground",
          icon: "bg-card text-muted-foreground",
          Icon: Equal,
          hint: "Los saldos coinciden, no se requiere ajuste",
        };

  const balanceError =
    realBalance !== "" && !isValid ? "Ingresá un saldo válido." : undefined;

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Conciliar saldo"
      description={`Compará el saldo de ${account.name} con tu extracto o billetera.`}
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
            {submitting ? "Conciliando..." : "Aplicar ajuste"}
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
        {/* Current ledger balance */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">Saldo en el libro mayor</span>
            <span className="text-xs text-muted-foreground">Calculado por Billefy</span>
          </div>
          <Amount value={account.balance} currency={account.currency} size="lg" />
        </div>

        <FormField
          label={`Saldo real verificado (${account.currency})`}
          hint="Ingresá el saldo que figura en tu extracto o billetera."
          required
          error={balanceError}
        >
          {(control) => (
            <Input
              {...control}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={realBalance}
              onChange={(e) => setRealBalance(sanitizeSignedDecimal(e.target.value))}
              placeholder="0.00"
              className="h-14 text-xl font-bold tabular-nums md:h-14 md:text-xl"
            />
          )}
        </FormField>

        {/* Computed difference */}
        <div
          role="status"
          className={`flex items-center gap-3 rounded-2xl border p-4 ${tone.box}`}
        >
          <div
            aria-hidden="true"
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}
          >
            <tone.Icon className="size-5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold text-foreground">Diferencia calculada</span>
            <span className="text-xs text-muted-foreground">{tone.hint}</span>
          </div>
          <Amount
            value={diff}
            currency={account.currency}
            sign={isPositive ? "always" : "auto"}
            size="md"
            tone="neutral"
            className={tone.value}
          />
        </div>

        <FormField label="Nota o motivo" hint="Opcional.">
          {(control) => (
            <Input
              {...control}
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Extracto mensual del banco"
            />
          )}
        </FormField>
      </form>
    </ResponsiveDrawer>
  );
}
