"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SlidersHorizontal, Plus, Trash2, Check, AlertTriangle } from "lucide-react";
import {
  DistributionPlan,
  PlanBucket,
  PLAN_PRESETS,
  bucketFromPreset,
  totalPercent,
  validatePlan,
  changeBucketTrackingMode,
} from "../domain/distribution-plan";
import { CATEGORY_COLOR_THEMES } from "@/modules/ledger/domain/category.types";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

interface AdjustRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: DistributionPlan;
  onSave: (buckets: PlanBucket[]) => void;
}

const DEFAULT_INIT_BUCKETS: PlanBucket[] = [
  { id: "b-1", name: "Necesidades", percent: 50, colorKey: "emerald", trackingMode: "Expenses", categoryIds: [] },
  { id: "b-2", name: "Estilo de vida", percent: 30, colorKey: "blue", trackingMode: "Expenses", categoryIds: [] },
  { id: "b-3", name: "Ahorro e inversión", percent: 20, colorKey: "violet", trackingMode: "TargetOnly", categoryIds: [] },
];

export function AdjustRuleModal({
  isOpen,
  onClose,
  plan,
  onSave,
}: AdjustRuleModalProps) {
  const { categories } = useUserCategories();
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.direction === "Expense"),
    [categories]
  );
  const expenseCategoryIds = useMemo(
    () => expenseCategories.map((c) => c.id),
    [expenseCategories]
  );

  const [localBuckets, setLocalBuckets] = useState<PlanBucket[]>(DEFAULT_INIT_BUCKETS);

  useEffect(() => {
    if (isOpen) {
      if (plan?.buckets && plan.buckets.length > 0) {
        setLocalBuckets(JSON.parse(JSON.stringify(plan.buckets)));
      } else {
        setLocalBuckets(DEFAULT_INIT_BUCKETS);
      }
    }
  }, [isOpen, plan]);

  const currentTotal = totalPercent(localBuckets);
  const validationErrors = useMemo(
    () => validatePlan(localBuckets, expenseCategoryIds),
    [localBuckets, expenseCategoryIds]
  );
  const isValid = validationErrors.length === 0;

  const patch = (id: string, changes: Partial<PlanBucket>) => {
    setLocalBuckets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...changes } : b))
    );
  };

  const toggleCategory = (bucketId: string, categoryId: string) => {
    setLocalBuckets((prev) =>
      prev.map((b) => {
        if (b.id === bucketId) {
          return {
            ...b,
            categoryIds: b.categoryIds.includes(categoryId)
              ? b.categoryIds.filter((c) => c !== categoryId)
              : [...b.categoryIds, categoryId],
          };
        }
        return {
          ...b,
          categoryIds: b.categoryIds.filter((c) => c !== categoryId),
        };
      })
    );
  };

  const addBucket = () => {
    if (localBuckets.length >= 8) return;
    const remaining = Math.max(0, 100 - currentTotal);
    setLocalBuckets((prev) => [
      ...prev,
      {
        id: `b-${Date.now()}`,
        name: `Grupo ${prev.length + 1}`,
        percent: remaining,
        colorKey: "violet",
        trackingMode: "Expenses",
        categoryIds: [],
      },
    ]);
  };

  const removeBucket = (id: string) => {
    if (localBuckets.length <= 2) return;
    setLocalBuckets((prev) => prev.filter((b) => b.id !== id));
  };

  const handleApply = () => {
    if (!isValid) return;
    onSave(localBuckets);
    onClose();
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-primary" />
          <span>Ajustar regla de distribución</span>
        </div>
      }
      description="Personalizá los porcentajes y categorías según tu estrategia financiera."
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 text-xs font-mono font-bold">
            <span className="text-muted-foreground">Total:</span>
            <span
              className={
                currentTotal === 100 ? "text-emerald-400" : "text-rose-400 font-black"
              }
            >
              {currentTotal}% / 100%
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 sm:flex-initial"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!isValid}
              onClick={handleApply}
              className="flex-1 sm:flex-initial font-bold"
            >
              Guardar y aplicar regla
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 py-2">
        {/* Preset Selector */}
        <div className="p-3.5 rounded-xl bg-card border border-border flex flex-col gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Plantillas predefinidas
          </span>
          <div className="flex flex-wrap gap-2">
            {PLAN_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setLocalBuckets(bucketFromPreset(p))}
                className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold transition text-foreground"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-bold">Para aplicar la regla:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Buckets List */}
        <div className="flex flex-col gap-3">
          {localBuckets.map((b) => {
            const theme = CATEGORY_COLOR_THEMES[b.colorKey] || CATEGORY_COLOR_THEMES.blue;
            return (
              <div
                key={b.id}
                className="p-3.5 rounded-2xl bg-card border border-border flex flex-col gap-3"
              >
                {/* Header row: name, percentage, delete */}
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: theme.swatchHex }}
                  />
                  <Input
                    value={b.name}
                    onChange={(e) => patch(b.id, { name: e.target.value })}
                    className="h-8 text-xs font-bold"
                    placeholder="Nombre del grupo"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <Input
                      type="number"
                      step="any"
                      value={String(b.percent)}
                      onChange={(e) =>
                        patch(b.id, {
                          percent: Number(e.target.value.replace(",", ".")) || 0,
                        })
                      }
                      className="w-16 h-8 text-right font-mono text-xs font-bold"
                    />
                    <span className="text-xs font-bold text-muted-foreground">%</span>
                  </div>
                  {localBuckets.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeBucket(b.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 transition"
                      title="Eliminar grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Mode toggle */}
                <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2">
                  <span className="text-muted-foreground font-medium">Tipo de seguimiento:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setLocalBuckets((prev) =>
                          prev.map((x) =>
                            x.id === b.id ? changeBucketTrackingMode(x, "Expenses") : x
                          )
                        )
                      }
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                        b.trackingMode !== "TargetOnly"
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Gastos
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLocalBuckets((prev) =>
                          prev.map((x) =>
                            x.id === b.id ? changeBucketTrackingMode(x, "TargetOnly") : x
                          )
                        )
                      }
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                        b.trackingMode === "TargetOnly"
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Solo objetivo
                    </button>
                  </div>
                </div>

                {/* Categories assignment if mode is Expenses */}
                {b.trackingMode !== "TargetOnly" && (
                  <div className="flex flex-col gap-1.5 border-t border-border/40 pt-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Categorías asociadas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {expenseCategories.map((c) => {
                        const isSelected = b.categoryIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCategory(b.id, c.id)}
                            className={`px-2 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1 ${
                              isSelected
                                ? "bg-primary/15 border-primary text-primary font-bold"
                                : "bg-background border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            <span>{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Bucket button */}
        {localBuckets.length < 8 && (
          <Button
            type="button"
            variant="outline"
            onClick={addBucket}
            className="rounded-xl border-dashed border-border text-xs font-bold gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar grupo</span>
          </Button>
        )}
      </div>
    </ResponsiveDrawer>
  );
}
