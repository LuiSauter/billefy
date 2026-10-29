"use client";

import React, { useState } from "react";
import { CreateBudgetRequest } from "@/modules/planning/domain/planning.types";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: CreateBudgetRequest) => Promise<void>;
}

const FORM_ID = "create-budget-form";

const CATEGORIES = [
  { label: "Alimentos & Mercado", emoji: "🍔" },
  { label: "Transporte & Gasolina", emoji: "🚗" },
  { label: "Vivienda", emoji: "🏠" },
  { label: "Ocio & Salidas", emoji: "🎉" },
  { label: "Salud & Farmacia", emoji: "💊" },
  { label: "Servicios", emoji: "💡" },
];

export function CreateBudgetModal({ isOpen, onClose, onSubmit }: CreateBudgetModalProps) {
  const [budgetType, setBudgetType] = useState<"category" | "global">("category");
  const [category, setCategory] = useState("Alimentos & Mercado");
  const [limit, setLimit] = useState("");
  const [currency] = useState("BOB");
  const [submitting, setSubmitting] = useState(false);

  const limitNum = parseFloat(limit) || 0;
  const alert80 = (limitNum * 0.8).toFixed(2);
  const safeDaily = (limitNum / 30).toFixed(2);
  const isValid = limitNum > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    try {
      await onSubmit({
        limitAmount: limitNum,
        currency,
        categoryId: budgetType === "category" ? category : undefined,
        alertThreshold: 0.8,
      });
      setLimit("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title="Nuevo presupuesto mensual"
      description="Configurá topes de gasto con alertas y sugerencias predictivas."
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
            {submitting ? "Creando..." : "Crear presupuesto"}
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
        <SegmentedControl
          aria-label="Tipo de presupuesto"
          fullWidth
          value={budgetType}
          onChange={setBudgetType}
          options={[
            { value: "category", label: "Por categoría" },
            { value: "global", label: "Presupuesto global" },
          ]}
        />

        {budgetType === "category" && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground">
              Seleccioná una categoría
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.label;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setCategory(cat.label)}
                    className={`h-11 px-3 rounded-xl border text-sm font-semibold transition flex items-center gap-2 truncate ${
                      isSelected
                        ? "bg-accent border-primary text-accent-foreground shadow-2xs"
                        : "bg-card border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <FormField label={`Límite máximo mensual (${currency})`} required>
          {(control) => (
            <MoneyInput
              {...control}
              size="lg"
              currency="Bs"
              value={limit}
              onValueChange={setLimit}
            />
          )}
        </FormField>

        {limitNum > 0 && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col gap-1 text-xs font-semibold text-emerald-900">
            <div>• Disparo de alerta temprana (80%): <strong className="tabular-nums">Bs. {alert80}</strong></div>
            <div>• Ritmo de gasto seguro: <strong className="tabular-nums">Bs. {safeDaily}</strong> / día</div>
          </div>
        )}
      </form>
    </ResponsiveDrawer>
  );
}
