"use client";

import React, { useEffect, useState } from "react";
import { AssetCategory, LiabilityCategory, PatrimonialAsset, PatrimonialLiability } from "../../domain/patrimonio.types";
import { normalizeAmountString } from "@/shared/lib/keypad";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { SelectField } from "@/shared/ui/select-field";

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
  { value: "other", label: "Otros / Colección" },
];

const liabilityCategories: { value: LiabilityCategory; label: string }[] = [
  { value: "mortgage", label: "Crédito hipotecario" },
  { value: "loan", label: "Préstamo personal" },
  { value: "creditcard", label: "Tarjeta de crédito" },
  { value: "other", label: "Otros pasivos" },
];

function toNumber(raw: string): number {
  const parsed = Number.parseFloat(normalizeAmountString(raw.trim()) || "0");
  return Number.isFinite(parsed) ? parsed : 0;
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
  const valid = name.trim().length > 0 && toNumber(amount) > 0;
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
          value: toNumber(amount),
          currency,
          notes: notes.trim() || undefined,
        });
      } else {
        await props.onAddLiability({
          name: name.trim(),
          category: category as LiabilityCategory,
          amount: toNumber(amount),
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
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-hidden placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15"
          />
        </FormField>
      </form>
    </ResponsiveDrawer>
  );
}
