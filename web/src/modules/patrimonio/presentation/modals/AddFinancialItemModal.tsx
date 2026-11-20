"use client";

import React, { useEffect, useState } from "react";
import Decimal from "decimal.js";
import { AssetCategory, LiabilityCategory, PatrimonialAsset, PatrimonialLiability } from "../../domain/patrimonio.types";
import { normalizeAmountString } from "@/shared/lib/keypad";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { SelectField } from "@/shared/ui/select-field";
import { Textarea } from "@/shared/ui/textarea";

type Currency = "BOB" | "USD";
type AssetPayload = Omit<PatrimonialAsset, "id" | "createdAt">;
type LiabilityPayload = Omit<PatrimonialLiability, "id" | "createdAt">;

type AddFinancialItemModalProps = {
  kind: "asset";
  isOpen: boolean;
  onClose: () => void;
  onAddAsset: (asset: AssetPayload) => Promise<void>;
  defaultCurrency?: Currency;
} | {
  kind: "liability";
  isOpen: boolean;
  onClose: () => void;
  onAddLiability: (liability: LiabilityPayload) => Promise<void>;
  defaultCurrency?: Currency;
};

const assetCategories: { value: AssetCategory; label: string }[] = [
  { value: "realestate", label: "Inmuebles" },
  { value: "vehicles", label: "Vehículos" },
  { value: "digital", label: "Activos digitales" },
  { value: "other", label: "Otros activos" },
];

const liabilityCategories: { value: LiabilityCategory; label: string }[] = [
  { value: "mortgage", label: "Crédito hipotecario" },
  { value: "loan", label: "Préstamo personal" },
  { value: "creditcard", label: "Tarjetas de crédito" },
  { value: "other", label: "Otros pasivos" },
];

/** Exact decimal parse of the typed amount; anything unparseable counts as zero (and keeps the form invalid). */
function parseAmount(raw: string): Decimal {
  try {
    const parsed = new Decimal(normalizeAmountString(raw.trim()) || "0");
    return parsed.isFinite() ? parsed : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
}

export function AddFinancialItemModal(props: AddFinancialItemModalProps) {
  const { kind, isOpen, onClose, defaultCurrency = "USD" } = props;
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory | LiabilityCategory>(kind === "asset" ? "realestate" : "loan");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setCurrency(defaultCurrency);
  }, [isOpen, defaultCurrency]);

  const isAsset = kind === "asset";
  const parsedAmount = parseAmount(amount);
  const valid = name.trim().length > 0 && parsedAmount.greaterThan(0);
  const formId = `add-financial-${kind}-form`;
  const title = isAsset ? "Agregar activo patrimonial" : "Registrar pasivo o deuda";
  const categories = isAsset ? assetCategories : liabilityCategories;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid) return;

    setSubmitting(true);
    try {
      if (props.kind === "asset") {
        await props.onAddAsset({
          name: name.trim(),
          category: category as AssetCategory,
          value: parsedAmount.toNumber(),
          currency,
          notes: notes.trim() || undefined,
        });
      } else {
        await props.onAddLiability({
          name: name.trim(),
          category: category as LiabilityCategory,
          amount: parsedAmount.toNumber(),
          currency,
          notes: notes.trim() || undefined,
        });
      }
      setName("");
      setAmount("");
      setNotes("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={title}
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" disabled={submitting} onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} disabled={!valid || submitting} loading={submitting}>
            {isAsset ? "Guardar activo" : "Guardar pasivo"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={isAsset ? "Categoría del activo" : "Tipo de pasivo"}>
          <SelectField
            value={category}
            onChange={(event) => setCategory(event.target.value as AssetCategory | LiabilityCategory)}
            options={categories}
          />
        </FormField>
        <FormField label={isAsset ? "Nombre o descripción" : "Acreedor o concepto"} required>
          <Input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </FormField>
        <FormField label="Moneda">
          <SegmentedControl
            aria-label="Moneda"
            fullWidth
            value={currency}
            onChange={setCurrency}
            options={[
              { value: "BOB", label: "Bolivianos (BOB)" },
              { value: "USD", label: "Dólares (USD)" },
            ]}
          />
        </FormField>
        <FormField label={isAsset ? "Valor estimado de mercado" : "Monto adeudado actual"} required>
          <MoneyInput value={amount} onValueChange={setAmount} currency={currency} />
        </FormField>
        <FormField label="Notas (opcional)">
          {(control) => (
            <Textarea {...control} value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className="min-h-0" />
          )}
        </FormField>
      </form>
    </ResponsiveDrawer>
  );
}
