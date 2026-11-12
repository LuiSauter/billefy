"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Investment } from "../../domain/investment.types";
import { normalizeAmountString } from "@/shared/lib/keypad";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { MoneyInput } from "@/shared/ui/money-input";
import { Input } from "@/shared/ui/input";
import { Amount, Percentage } from "@/shared/ui/amount";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";

interface UpdatePriceModalProps {
  investment: Investment | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateValue: (id: string, newValue: number, newQuantity?: number) => Promise<void>;
  /** ISO code of the valuation currency ("BOB" | "USD"). */
  currency?: string;
}

function toNumber(raw: string): number {
  const n = parseFloat(normalizeAmountString(raw.trim()) || "0");
  return Number.isFinite(n) ? n : 0;
}

export function UpdatePriceModal({
  investment,
  isOpen,
  onClose,
  onUpdateValue,
  currency = "USD",
}: UpdatePriceModalProps) {
  const [mode, setMode] = useState<"unitPrice" | "totalValue">("unitPrice");
  const [unitPriceStr, setUnitPriceStr] = useState("");
  const [totalValueStr, setTotalValueStr] = useState("");
  const [quantityStr, setQuantityStr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (investment && isOpen) {
      const qty = investment.quantity > 0 ? investment.quantity : 1;
      const initialUnitPrice = investment.currentValue / qty;
      setQuantityStr(String(investment.quantity));
      setUnitPriceStr(String(Number(initialUnitPrice.toFixed(2))));
      setTotalValueStr(String(investment.currentValue));
      setMode("unitPrice");
    }
  }, [investment, isOpen]);

  if (!isOpen || !investment) return null;

  const currentVal = investment.currentValue || 0;
  const qty = toNumber(quantityStr) || investment.quantity || 1;

  // Real-time calculations depending on active input mode
  let computedTotal = 0;
  let computedUnitPrice = 0;

  if (mode === "unitPrice") {
    computedUnitPrice = toNumber(unitPriceStr);
    computedTotal = Number((computedUnitPrice * qty).toFixed(2));
  } else {
    computedTotal = toNumber(totalValueStr);
    computedUnitPrice = qty > 0 ? Number((computedTotal / qty).toFixed(2)) : 0;
  }

  const diffNominal = computedTotal - currentVal;
  const diffPct = currentVal > 0 ? (diffNominal / currentVal) * 100 : 0;
  const isPositive = diffNominal >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (computedTotal <= 0) return;

    setSubmitting(true);
    try {
      await onUpdateValue(investment.id, computedTotal, toNumber(quantityStr) || undefined);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => { if (!open && !submitting) onClose(); }}
      title="Actualizar precio / valuación"
      description={investment.name}
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="update-price-form" disabled={computedTotal <= 0} loading={submitting}>
            Guardar nuevo valor
          </Button>
        </>
      }
    >
      <form id="update-price-form" onSubmit={handleSubmit} className="space-y-4">
        <SegmentedControl
          fullWidth
          aria-label="Modo de actualización"
          value={mode}
          onChange={(next) => {
            setMode(next);
            if (next === "unitPrice") setUnitPriceStr(computedUnitPrice > 0 ? String(computedUnitPrice) : "");
            else setTotalValueStr(computedTotal > 0 ? String(computedTotal) : "");
          }}
          options={[
            { value: "unitPrice", label: "Por precio unitario" },
            { value: "totalValue", label: "Por valor total" },
          ]}
        />

        {mode === "unitPrice" ? (
          <FormField
            label="Nuevo precio unitario"
            hint={<>Valor total resultante: <Amount value={computedTotal} currency={currency} size="inherit" /></>}
          >
            {(control) => (
              <MoneyInput {...control} currency={currency} value={unitPriceStr} onValueChange={setUnitPriceStr} autoFocus />
            )}
          </FormField>
        ) : (
          <FormField
            label="Nuevo valor total de la posición"
            hint={<>Precio unitario resultante: <Amount value={computedUnitPrice} currency={currency} size="inherit" /></>}
          >
            {(control) => (
              <MoneyInput {...control} currency={currency} value={totalValueStr} onValueChange={setTotalValueStr} autoFocus />
            )}
          </FormField>
        )}

        <FormField label={`Cantidad de unidades (${investment.currency})`}>
          {(control) => (
            <Input {...control} type="text" inputMode="decimal" value={quantityStr} onChange={(e) => setQuantityStr(e.target.value)} />
          )}
        </FormField>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">Variación frente al valor anterior</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm">
              <Amount value={currentVal} currency={currency} size="inherit" />
              <span aria-hidden="true">→</span>
              <Amount value={computedTotal} currency={currency} size="inherit" />
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
              isPositive ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {isPositive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            <Percentage value={diffPct} sign="always" size="inherit" tone="inherit" />
          </span>
        </div>
      </form>
    </ResponsiveDrawer>
  );
}
