"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CreateBudgetRequest } from "@/modules/planning/domain/planning.types";
import { UserCategory } from "@/modules/ledger/domain/category.types";
import { isValidUuid } from "@/modules/ledger/application/CategoriesContext";
import { CategoryPickerField } from "@/modules/ledger/presentation/CategoryPickerField";
import { CategoryCreatorView } from "@/modules/ledger/presentation/CategoryCreatorView";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { Amount } from "@/shared/ui/amount";
import { formatCurrencyLabel } from "@/shared/lib/currency";

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: CreateBudgetRequest) => Promise<void>;
}

const FORM_ID = "create-budget-form";
const CAT_FORM_ID = "create-budget-category-form";

export function CreateBudgetModal({ isOpen, onClose, onSubmit }: CreateBudgetModalProps) {
  const [budgetType, setBudgetType] = useState<"category" | "global">("category");
  const [selectedCategory, setSelectedCategory] = useState<UserCategory | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCategoryFormValid, setIsCategoryFormValid] = useState(false);
  const [limit, setLimit] = useState("");
  const [currency] = useState("BOB");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsCreatingCategory(false);
    }
  }, [isOpen]);

  const limitNum = parseFloat(limit) || 0;
  const alert80 = limitNum * 0.8;
  const safeDaily = limitNum / 30;
  const isValid = limitNum > 0 && (budgetType === "global" || !!selectedCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    try {
      await onSubmit({
        limitAmount: limitNum,
        currency,
        categoryId:
          budgetType === "category" &&
          selectedCategory &&
          isValidUuid(selectedCategory.id)
            ? selectedCategory.id
            : undefined,
        alertThreshold: 0.8,
      });
      setLimit("");
      setSelectedCategory(null);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={
        isCreatingCategory
          ? "Nueva categoría de gasto"
          : "Nuevo presupuesto mensual"
      }
      description={
        isCreatingCategory
          ? "Elegí un nombre, color de fondo e ícono para tu categoría."
          : "Configurá topes de gasto por categoría personalizada o de forma global."
      }
      footer={
        isCreatingCategory ? (
          <>
            <Button
              type="submit"
              form={CAT_FORM_ID}
              size="lg"
              disabled={!isCategoryFormValid}
              className="order-1 w-full md:order-2 md:flex-1"
            >
              Crear y seleccionar categoría
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setIsCreatingCategory(false)}
              className="order-2 w-full md:order-1 md:w-auto md:border-input md:bg-card gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </>
        ) : (
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
        )
      }
    >
      {isCreatingCategory ? (
        <CategoryCreatorView
          formId={CAT_FORM_ID}
          direction="Expense"
          onCancel={() => setIsCreatingCategory(false)}
          onValidityChange={setIsCategoryFormValid}
          onCreated={(created) => {
            setSelectedCategory(created);
            setIsCreatingCategory(false);
          }}
        />
      ) : (
        <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
          <SegmentedControl
            aria-label="Tipo de presupuesto"
            fullWidth
            value={budgetType}
            onChange={setBudgetType}
            options={[
              { value: "category", label: "Por categoría de gasto" },
              { value: "global", label: "Presupuesto global" },
            ]}
          />

          {budgetType === "category" && (
            <CategoryPickerField
              direction="Expense"
              selectedCategoryId={selectedCategory?.id || ""}
              onSelectCategory={setSelectedCategory}
              onRequestCreateCategory={() => setIsCreatingCategory(true)}
            />
          )}

          <FormField label={`Límite máximo mensual (${currency})`} required>
            {(control) => (
              <MoneyInput
                {...control}
                size="lg"
                currency={formatCurrencyLabel(currency)}
                value={limit}
                onValueChange={setLimit}
              />
            )}
          </FormField>

          {limitNum > 0 && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-1 text-xs font-semibold text-emerald-500">
              <div>• Disparo de alerta temprana (80%): <strong><Amount value={alert80} currency={currency} size="xs" /></strong></div>
              <div>• Ritmo de gasto seguro: <strong><Amount value={safeDaily} currency={currency} size="xs" /></strong> / día</div>
            </div>
          )}
        </form>
      )}
    </ResponsiveDrawer>
  );
}
