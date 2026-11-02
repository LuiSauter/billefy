"use client";

import React from "react";
import { Plus, Pencil } from "lucide-react";
import { BudgetDto, getBudgetCategoryEmoji } from "../domain/planning.types";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { CategoryIconBadge } from "@/modules/ledger/presentation/CategoryIcon";
import { Button } from "@/shared/ui/button";

interface CategoryExpensesCardProps {
  budgets: BudgetDto[];
  onOpenCreateBudgetModal: () => void;
  onEditBudget: (budget: BudgetDto) => void;
  formatMoney: (amount: number) => string;
}

export function CategoryExpensesCard({
  budgets,
  onOpenCreateBudgetModal,
  onEditBudget,
  formatMoney,
}: CategoryExpensesCardProps) {
  const { findCategory } = useUserCategories();

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-2xs flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
          Gastos por categoría
        </h2>
        {budgets.length > 0 && (
          <span className="text-xs font-semibold text-muted-foreground">
            {budgets.length} {budgets.length === 1 ? "categoría" : "categorías"}
          </span>
        )}
      </div>

      {budgets.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center gap-3">
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
            No tienes presupuestos por categoría configurados para este mes.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onOpenCreateBudgetModal}
            className="rounded-xl font-bold gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Crear primer presupuesto</span>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/60 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 font-semibold">Categoría</th>
                <th className="pb-3 text-right font-semibold">Presupuesto</th>
                <th className="pb-3 text-right font-semibold">Gastado</th>
                <th className="pb-3 pl-4 font-semibold min-w-[140px]">Progreso</th>
                <th className="pb-3 text-right w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {budgets.map((b) => {
                const category = b.categoryId ? findCategory(b.categoryId) : null;
                const categoryName = category
                  ? category.name
                  : b.categoryId
                  ? "Categoría no disponible"
                  : "Gastos Generales";
                const iconKey = category?.iconKey || "sparkles";
                const colorKey = category?.colorKey || "blue";

                const limit = Number(b.limitAmount) || 0;
                const spent = Number(b.spentAmount) || 0;
                const ratio = limit > 0 ? (spent / limit) * 100 : 0;
                const percentage = Math.round(ratio);
                const isSavings =
                  categoryName.toLowerCase().includes("ahorro") ||
                  categoryName.toLowerCase().includes("inversión");

                // Color based on status
                let progressColor = "bg-emerald-500";
                if (isSavings) {
                  progressColor = "bg-purple-500";
                } else if (ratio >= 100) {
                  progressColor = "bg-rose-500";
                } else if (ratio >= 80) {
                  progressColor = "bg-amber-400";
                }

                return (
                  <tr key={b.id} className="hover:bg-muted/40 transition-colors group">
                    {/* Categoría */}
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {category ? (
                          <CategoryIconBadge iconKey={iconKey} colorKey={colorKey} size="sm" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-muted text-foreground flex items-center justify-center text-xs shrink-0">
                            {getBudgetCategoryEmoji(categoryName)}
                          </div>
                        )}
                        <span className="font-bold text-foreground truncate max-w-[150px] sm:max-w-[180px]">
                          {categoryName}
                        </span>
                      </div>
                    </td>

                    {/* Presupuesto */}
                    <td className="py-3 px-2 text-right font-mono font-medium text-foreground whitespace-nowrap">
                      {formatMoney(limit)}
                    </td>

                    {/* Gastado */}
                    <td className="py-3 px-2 text-right font-mono font-bold text-foreground whitespace-nowrap">
                      {formatMoney(spent)}
                    </td>

                    {/* Progreso */}
                    <td className="py-3 pl-4 pr-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-2 rounded-full bg-muted/80 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-foreground w-9 text-right shrink-0">
                          {percentage}%
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 pl-1 text-right">
                      <button
                        type="button"
                        onClick={() => onEditBudget(b)}
                        title="Editar presupuesto"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
