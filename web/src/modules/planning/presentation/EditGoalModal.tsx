"use client";

import React, { useMemo, useState, useEffect } from "react";
import Decimal from "decimal.js";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { GoalDto, UpdateGoalRequest } from "@/modules/planning/domain/planning.types";
import { eligibleGoalAccounts } from "@/modules/planning/domain/goals-overview";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SelectField } from "@/shared/ui/select-field";
import { formatCurrencyLabel } from "@/shared/lib/currency";

export interface EditGoalModalProps {
  goal: GoalDto;
  accounts: AccountDto[];
  onClose: () => void;
  onSubmit: (id: string, req: UpdateGoalRequest) => Promise<void>;
  onOpenAccounts?: () => void;
}

const FORM_ID = "edit-goal-form";

export function EditGoalModal({
  goal,
  accounts,
  onClose,
  onSubmit,
  onOpenAccounts,
}: EditGoalModalProps) {
  const [name, setName] = useState(goal.name);
  const [targetAmount, setTargetAmount] = useState(String(goal.targetAmount));
  const [targetDate, setTargetDate] = useState(goal.targetDate || "");
  const [accountId, setAccountId] = useState(goal.accountId || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setTargetDate(goal.targetDate || "");
    setAccountId(goal.accountId || "");
  }, [goal]);

  const matchingAccounts = useMemo(
    () => eligibleGoalAccounts(accounts, goal.currency),
    [accounts, goal.currency]
  );

  let target: Decimal;
  try {
    target = new Decimal(targetAmount || 0);
  } catch {
    target = new Decimal(0);
  }
  const isValid = name.trim().length > 0 && target.isFinite() && target.gt(0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(goal.id, {
        name: name.trim(),
        targetAmount: target.toNumber(),
        targetDate: targetDate || undefined,
        accountId: accountId || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar la meta.");
    } finally {
      setSubmitting(false);
    }
  };

  const currencySymbol = formatCurrencyLabel(goal.currency);
  const reserved = goal.fundingMode === "ReservedFunds";

  return (
    <ResponsiveDrawer
      open
      onOpenChange={(open) => !open && !submitting && onClose()}
      size="md"
      title="Editar meta"
      description={reserved ? "Modificá nombre, objetivo y fecha. Las asignaciones se administran por separado; el modo y la cuenta se conservan." : "Modificá el nombre, monto objetivo, fecha y cuenta vinculada. Se conserva el seguimiento del saldo completo."}
      footer={
        <>
          <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            loading={submitting}
            disabled={!isValid}
            className="order-1 w-full md:order-2 md:flex-1 font-bold"
          >
            {submitting ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={submitting}
            onClick={onClose}
            className="order-2 w-full md:order-1 md:w-auto"
          >
            Cancelar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <FormField label="Nombre de la meta" required>
          {(control) => (
            <Input
              {...control}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Viaje, vivienda"
            />
          )}
        </FormField>

        <FormField label="Moneda (no modificable)">
          {(control) => (
            <Input
              {...control}
              type="text"
              value={`${goal.currency} (${currencySymbol})`}
              readOnly
              className="bg-muted/50 cursor-not-allowed text-xs"
            />
          )}
        </FormField>

        <FormField label="Monto meta" required>
          {(control) => (
            <MoneyInput
              {...control}
              size="lg"
              currency={currencySymbol}
              value={targetAmount}
              onValueChange={setTargetAmount}
            />
          )}
        </FormField>

        <FormField
          label="Fecha límite"
          hint="Opcional. Estimación para calcular la guía de ahorro mensual."
        >
          {(control) => (
            <Input
              {...control}
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          )}
        </FormField>

        <FormField
          label="Cuenta vinculada"
          hint={reserved ? "Cuenta de respaldo. No se cuenta su saldo completo ni se convierte la meta a otro modo." : "Opcional. Cuentas en la misma moneda cuyo saldo suma al avance de la meta."}
        >
          {(control) => (
            <SelectField
              {...control}
              value={accountId}
              disabled={reserved || submitting}
              onChange={(e) => setAccountId(e.target.value)}
              options={[
                { value: "", label: "Sin cuenta vinculada" },
                ...matchingAccounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                  description: account.currency,
                })),
              ]}
            />
          )}
        </FormField>

        {matchingAccounts.length === 0 && (
          <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
            <p>No hay cuentas activas en {goal.currency}.</p>
            {onOpenAccounts && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAccounts();
                }}
                className="mt-2 min-h-11 font-semibold text-primary underline"
              >
                Ver cuentas
              </button>
            )}
          </div>
        )}
      </form>
    </ResponsiveDrawer>
  );
}
