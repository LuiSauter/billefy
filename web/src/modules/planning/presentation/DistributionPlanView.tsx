"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { TransactionDto } from "@/modules/ledger/domain/ledger.types";
import {
  getActiveTransactions,
  monthKey,
  monthLabel,
  sumByMonth,
  toBob,
} from "@/modules/ledger/domain/monthly-analytics";
import { CATEGORY_COLOR_THEMES } from "@/modules/ledger/domain/category.types";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { CategoryIconBadge } from "@/modules/ledger/presentation/CategoryIcon";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  PLAN_PRESETS,
  PlanBucket,
  bucketFromPreset,
  totalPercent,
} from "../domain/distribution-plan";
import { DistributionPlanController } from "../application/useDistributionPlan";

interface DistributionPlanViewProps {
  controller: DistributionPlanController;
  transactions: TransactionDto[];
  p2pRate: number;
}

export function DistributionPlanView({
  controller,
  transactions,
  p2pRate,
}: DistributionPlanViewProps) {
  const { plan, setBuckets } = controller;
  const { buckets } = plan;
  const { getCategoriesByDirection } = useUserCategories();
  const expenseCategories = getCategoriesByDirection("Expense");
  const [editOverride, setEditOverride] = useState<boolean | null>(null);
  const editing = editOverride ?? buckets.length === 0;

  const month = monthKey(new Date());
  const income = useMemo(
    () => sumByMonth(transactions, month, "Income", p2pRate),
    [transactions, month, p2pRate]
  );

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of getActiveTransactions(transactions)) {
      if (t.direction !== "Expense" || !t.categoryId) continue;
      const d = new Date(t.occurredAt);
      if (isNaN(d.getTime()) || monthKey(d) !== month) continue;
      map.set(
        t.categoryId,
        (map.get(t.categoryId) ?? 0) + toBob(Number(t.amount) || 0, t.currency, p2pRate)
      );
    }
    return map;
  }, [transactions, month, p2pRate]);

  const total = totalPercent(buckets);
  const assigned = new Set(buckets.flatMap((b) => b.categoryIds));
  const unassigned = expenseCategories.filter((c) => !assigned.has(c.id));

  const patch = (id: string, changes: Partial<PlanBucket>) =>
    setBuckets(buckets.map((b) => (b.id === id ? { ...b, ...changes } : b)));

  const toggleCategory = (bucketId: string, categoryId: string) => {
    setBuckets(
      buckets.map((b) => {
        if (b.id === bucketId) {
          return {
            ...b,
            categoryIds: b.categoryIds.includes(categoryId)
              ? b.categoryIds.filter((c) => c !== categoryId)
              : [...b.categoryIds, categoryId],
          };
        }
        return { ...b, categoryIds: b.categoryIds.filter((c) => c !== categoryId) };
      })
    );
  };

  const addBucket = () =>
    setBuckets([
      ...buckets,
      {
        id: `b-${Date.now()}`,
        name: `Grupo ${buckets.length + 1}`,
        percent: Math.max(0, 100 - total),
        colorKey: "violet",
        categoryIds: [],
      },
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-black text-foreground tracking-tight">
            Plan de distribución
          </h1>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            {monthLabel(month)} • Ingresos del mes:{" "}
            <span className="font-mono font-bold text-foreground">
              Bs {Math.round(income).toLocaleString("en-US")}
            </span>
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setEditOverride(!editing)}
          className="border border-border"
        >
          {editing ? "Ver seguimiento" : "Configurar plan"}
        </Button>
      </div>

      {editing ? (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Empezá con una plantilla (o armá la tuya)
            </span>
            <div className="flex flex-wrap gap-2">
              {PLAN_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setBuckets(bucketFromPreset(p))}
                  className="px-3 h-8 rounded-full border border-border bg-background text-xs font-bold hover:bg-muted transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {buckets.map((b) => {
            const theme = CATEGORY_COLOR_THEMES[b.colorKey];
            return (
              <div
                key={b.id}
                className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: theme.swatchHex }}
                  />
                  <Input
                    aria-label="Nombre del grupo"
                    value={b.name}
                    onChange={(e) => patch(b.id, { name: e.target.value })}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <Input
                      aria-label="Porcentaje"
                      inputMode="numeric"
                      value={String(b.percent)}
                      onChange={(e) =>
                        patch(b.id, {
                          percent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                        })
                      }
                      className="w-16 text-right"
                    />
                    <span className="text-sm font-bold text-muted-foreground">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBuckets(buckets.filter((x) => x.id !== b.id))}
                    title="Quitar grupo"
                    className="p-2 text-muted-foreground hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {expenseCategories.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      Creá categorías de gasto para asignarlas a este grupo.
                    </span>
                  )}
                  {expenseCategories.map((c) => {
                    const inThis = b.categoryIds.includes(c.id);
                    const elsewhere = !inThis && assigned.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCategory(b.id, c.id)}
                        className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 h-7 rounded-full border text-xs font-semibold transition ${
                          inThis
                            ? "bg-accent border-primary text-foreground"
                            : elsewhere
                            ? "bg-background border-border text-muted-foreground opacity-50"
                            : "bg-background border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        <CategoryIconBadge iconKey={c.iconKey} colorKey={c.colorKey} size="sm" />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={addBucket} className="gap-1.5 border border-border">
              <Plus className="w-4 h-4" /> Agregar grupo
            </Button>
            <span
              className={`text-sm font-extrabold font-mono ${
                total === 100 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              Total: {total}%
            </span>
          </div>

          {total !== 100 && buckets.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
              <AlertTriangle className="w-3.5 h-3.5" /> Los porcentajes deben sumar 100%.
            </p>
          )}
          {unassigned.length > 0 && buckets.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Sin asignar: {unassigned.map((c) => c.name).join(", ")}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {buckets.map((b) => {
            const theme = CATEGORY_COLOR_THEMES[b.colorKey];
            const target = (income * b.percent) / 100;
            const spent = b.categoryIds.reduce((a, id) => a + (spentByCategory.get(id) ?? 0), 0);
            const ratio = target > 0 ? Math.min(100, (spent / target) * 100) : 0;
            const over = target > 0 && spent > target;
            return (
              <div key={b.id} className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.swatchHex }} />
                    {b.name}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">{b.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all ${over ? "bg-rose-500" : ""}`}
                    style={{
                      width: `${ratio}%`,
                      backgroundColor: over ? undefined : theme.swatchHex,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className={over ? "text-rose-500 font-bold" : "text-foreground font-bold"}>
                    Bs {Math.round(spent).toLocaleString("en-US")}
                  </span>
                  <span className="text-muted-foreground">
                    de Bs {Math.round(target).toLocaleString("en-US")}
                  </span>
                </div>
              </div>
            );
          })}
          {buckets.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Todavía no configuraste tu plan. Tocá «Configurar plan».
            </p>
          )}
        </div>
      )}
    </div>
  );
}
