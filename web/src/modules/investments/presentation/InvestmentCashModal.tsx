"use client";

import React, { useRef, useState } from "react";
import Decimal from "decimal.js";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { InvestmentsController } from "../application/useInvestments";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { SelectField } from "@/shared/ui/select-field";
import { SegmentedControl, SegmentedOption } from "@/shared/ui/segmented-control";

interface Props {
  open: boolean;
  onClose: () => void;
  controller: InvestmentsController;
  accounts: AccountDto[];
  onComplete: () => Promise<void>;
  /** When the modal is opened from a specific asset, that asset is preselected and locked. */
  investmentId?: string;
}

const FORM_ID = "investment-cash-form";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const KIND_OPTIONS: SegmentedOption<"Contribution" | "Disposal">[] = [
  { value: "Contribution", label: "Aporte", tone: "expense" },
  { value: "Disposal", label: "Retiro", tone: "income" },
];

export function InvestmentCashModal({
  open,
  onClose,
  controller,
  accounts,
  onComplete,
  investmentId: lockedInvestmentId,
}: Props) {
  const [pickedInvestmentId, setInvestmentId] = useState("");
  const investmentId = lockedInvestmentId ?? pickedInvestmentId;
  const [accountId, setAccountId] = useState("");
  const [kind, setKind] = useState<"Contribution" | "Disposal">("Contribution");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(today);
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);

  const close = () => {
    setInvestmentId("");
    setAccountId("");
    setKind("Contribution");
    setAmount("");
    setOccurredAt(today());
    setDescription("");
    setError("");
    setSaved(false);
    lock.current = false;
    onClose();
  };

  if (!open) return null;

  const investments = controller.investments.filter(
    (i) => !(i as typeof i & { archivedAt?: string | null }).archivedAt
  );

  let validAmount = false;
  try {
    validAmount =
      /^\d+(?:\.\d+)?$/.test(amount.trim()) &&
      new Decimal(amount.trim()).isFinite() &&
      new Decimal(amount.trim()).gt(0);
  } catch {
    validAmount = false;
  }

  const valid = !!investmentId && !!accountId && !!occurredAt && validAmount;
  const selectedAccount = accounts.find((a) => a.id === accountId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || lock.current || saved) return;
    lock.current = true;
    setPending(true);
    setError("");

    try {
      await controller.recordCash(investmentId, kind, {
        accountId,
        amount: amount.trim(),
        occurredAt: new Date(`${occurredAt}T12:00:00`).toISOString(),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No se pudo guardar el movimiento."
      );
      lock.current = false;
      setPending(false);
      return;
    }

    setSaved(true);
    try {
      await controller.refreshAfterCash();
      await onComplete();
      close();
    } catch {
      setError(
        "El movimiento se guardó, pero no se pudieron actualizar los datos. No lo vuelvas a enviar; recarga la página para ver el resultado."
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={(isOpen) => !isOpen && close()}
      title="Movimiento de inversión"
      description="El aporte o retiro afecta la cuenta elegida. No cambia el valor ni la cantidad de la inversión."
      size="md"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={close}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={!valid || pending || saved}
            loading={pending}
            className="w-full sm:w-auto"
          >
            {pending ? "Guardando…" : saved ? "Guardado" : "Guardar movimiento"}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-4 py-2">
        <FormField label="Tipo de movimiento">
          <SegmentedControl
            aria-label="Tipo de movimiento de inversión"
            fullWidth
            options={KIND_OPTIONS}
            value={kind}
            onChange={(val) => setKind(val)}
          />
        </FormField>

        <FormField label="Activo" required>
          <SelectField
            aria-label="Activo"
            required
            value={investmentId}
            disabled={!!lockedInvestmentId}
            onChange={(e) => setInvestmentId(e.target.value)}
          >
            <option value="">Selecciona una inversión</option>
            {investments.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField label="Cuenta de efectivo" required>
          <SelectField
            aria-label="Cuenta de efectivo"
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">Selecciona una cuenta</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.currency}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField
          label={`Monto ${selectedAccount ? `(${selectedAccount.currency})` : "(moneda de la cuenta)"}`}
          required
        >
          <div className="relative">
            <Input
              aria-label="Monto de inversión"
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={selectedAccount ? "pr-16" : ""}
            />
            {selectedAccount && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {selectedAccount.currency}
              </span>
            )}
          </div>
        </FormField>

        <FormField label="Fecha" required>
          <Input
            aria-label="Fecha del movimiento"
            type="date"
            required
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </FormField>

        <FormField label="Descripción" hint="Opcional">
          <Input
            aria-label="Descripción del movimiento de inversión"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Aporte inicial, cobro de dividendos..."
          />
        </FormField>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}
      </form>
    </ResponsiveDrawer>
  );
}
