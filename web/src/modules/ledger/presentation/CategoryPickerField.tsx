"use client";

import React, { useState } from "react";
import { Plus, Trash2, Check, AlertTriangle } from "lucide-react";
import { TransactionDirection } from "../domain/ledger.types";
import { UserCategory } from "../domain/category.types";
import { CategoryIconBadge } from "./CategoryIcon";
import { useUserCategories } from "../application/CategoriesContext";
import { Button } from "@/shared/ui/button";

interface CategoryPickerFieldProps {
  direction: TransactionDirection;
  selectedCategoryId: string;
  onSelectCategory: (category: UserCategory | null) => void;
  onRequestCreateCategory: () => void;
}

export function CategoryPickerField({
  direction,
  selectedCategoryId,
  onSelectCategory,
  onRequestCreateCategory,
}: CategoryPickerFieldProps) {
  const { getCategoriesByDirection, deleteCategory } = useUserCategories();
  const [categoryPendingDelete, setCategoryPendingDelete] =
    useState<UserCategory | null>(null);

  const directionCategories = getCategoriesByDirection(direction);
  const isExpense = direction === "Expense";
  const directionLabel = isExpense ? "gasto" : "ingreso";

  const handleConfirmDelete = () => {
    if (!categoryPendingDelete) return;
    const isCurrentlySelected =
      selectedCategoryId === categoryPendingDelete.id ||
      selectedCategoryId.toLowerCase() ===
        categoryPendingDelete.name.toLowerCase();
    if (isCurrentlySelected) {
      onSelectCategory(null);
    }
    deleteCategory(categoryPendingDelete.id);
    setCategoryPendingDelete(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">
          Galería de categorías de {directionLabel}
        </span>
        <button
          type="button"
          onClick={onRequestCreateCategory}
          className="inline-flex items-center gap-1 text-xs font-extrabold text-primary hover:underline transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva categoría</span>
        </button>
      </div>

      {/* Delete Confirmation Alert */}
      {categoryPendingDelete && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="text-xs font-bold text-foreground">
              ¿Estás seguro de eliminar la categoría{" "}
              <span className="text-rose-400">
                «{categoryPendingDelete.name}»
              </span>
              ?
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCategoryPendingDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
            >
              Sí, eliminar
            </Button>
          </div>
        </div>
      )}

      {directionCategories.length === 0 ? (
        <div className="p-5 rounded-2xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-foreground">
              Aún no tenés categorías de {directionLabel}
            </span>
            <span className="text-xs text-muted-foreground">
              Creá tu primera categoría con ícono y color personalizado en segundos.
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onRequestCreateCategory}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Crear categoría de {directionLabel}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {directionCategories.map((cat) => {
            const isSelected =
              selectedCategoryId === cat.id ||
              (!!selectedCategoryId &&
                selectedCategoryId.toLowerCase() === cat.name.toLowerCase());

            return (
              <div
                key={cat.id}
                className={`group relative rounded-2xl border transition flex items-center justify-between p-2.5 ${
                  isSelected
                    ? "bg-primary/15 border-primary ring-2 ring-primary/40 shadow-xs"
                    : "bg-card border-border hover:border-primary/40 hover:bg-muted/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left focus:outline-hidden"
                >
                  <CategoryIconBadge
                    iconKey={cat.iconKey}
                    colorKey={cat.colorKey}
                    size="md"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-extrabold text-foreground truncate">
                      {cat.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {isSelected ? "Seleccionada" : "Clic para elegir"}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0 ml-1">
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-2xs">
                      <Check className="w-3 h-3 stroke-3" />
                    </span>
                  )}
                  <button
                    type="button"
                    title={`Eliminar ${cat.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryPendingDelete(cat);
                    }}
                    className="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/15 hover:text-rose-500 text-muted-foreground transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={onRequestCreateCategory}
            className="rounded-2xl border border-dashed border-border hover:border-primary/60 bg-background/50 hover:bg-muted/50 p-2.5 flex items-center justify-center gap-2 text-xs font-extrabold text-primary transition min-h-[58px]"
          >
            <Plus className="w-4 h-4" />
            <span>Crear nueva</span>
          </button>
        </div>
      )}
    </div>
  );
}
