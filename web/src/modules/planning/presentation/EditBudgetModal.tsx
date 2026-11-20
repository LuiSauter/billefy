"use client";

import React, { useRef, useState } from "react";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { BudgetMutationResult } from "../application/budget-resource";
import { BudgetDto, UpdateBudgetRequest } from "../domain/planning.types";
import { budgetCurrencyDecimals, budgetEditFields, createBudgetEditSubmitter } from "../domain/budget-edit";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { getErrorMessage } from "@/shared/lib/error-message";

export interface EditBudgetModalProps {
  budget: BudgetDto;
  onClose: (result?: BudgetMutationResult) => void;
  onSubmit: (id: string, request: UpdateBudgetRequest) => Promise<BudgetMutationResult>;
}

const FORM_ID = "edit-budget-form";

// Mounted with the selected budget's key; background reloads never reset local input.
export function EditBudgetModal({ budget, onClose, onSubmit }: EditBudgetModalProps) {
  const { findCategory } = useUserCategories();
  const [fields, setFields] = useState(() => budgetEditFields(budget));
  const [submit] = useState(() => createBudgetEditSubmitter(onSubmit));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const category = budget.categoryId ? findCategory(budget.categoryId)?.name || "Categoría no disponible" : "Gastos Generales";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submit(budget, fields);
      if (result?.applied) onClose(result); // Failed refresh is still a saved edit, never a retryable PUT.
    } catch (cause) {
      setError(getErrorMessage(cause, "No se pudo guardar el presupuesto."));
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveDrawer
      open onOpenChange={(open) => { if (!open && !busy.current) onClose(); }}
      title="Editar presupuesto" description="Modificá el límite y la alerta sin cambiar la categoría, moneda ni período."
      size="md" hideCloseButton={submitting}
      footer={<>
        <Button type="submit" form={FORM_ID} size="lg" loading={submitting} className="w-full md:w-auto">
          {submitting ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" size="lg" disabled={submitting} onClick={() => onClose()}>Cancelar</Button>
      </>}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <FormField label="Categoría">
          {(control) => <Input {...control} value={category} readOnly />}
        </FormField>
        <FormField label="Moneda">
          {(control) => <Input {...control} value={budget.currency} readOnly />}
        </FormField>
        <FormField label="Período">
          {(control) => <Input {...control} value={budget.period.toLowerCase() === "monthly" ? "Mensual" : budget.period} readOnly />}
        </FormField>
        <FormField label={`Límite (${budget.currency})`} required>
          {(control) => <MoneyInput {...control} currency={budget.currency} value={fields.limit}
            maxDecimals={budgetCurrencyDecimals(budget.currency)} disabled={submitting} size="lg"
            onValueChange={(limit) => setFields((previous) => ({ ...previous, limit }))} />}
        </FormField>
        <FormField label="Alerta (%)" required hint="Usá un entero del 1 al 100. Si el valor actual tiene decimales, se conserva al abrir. Elegí explícitamente un porcentaje entero para guardar.">
          {(control) => <Input {...control} type="text" inputMode="decimal" value={fields.alertPercent} disabled={submitting}
            onChange={(event) => setFields((previous) => ({ ...previous, alertPercent: event.target.value }))} />}
        </FormField>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>
    </ResponsiveDrawer>
  );
}
