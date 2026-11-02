"use client";

import React, { useMemo, useState } from "react";
import { Info, Settings, AlertTriangle, CheckCircle2, BarChart3, PieChart as PieIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { DistributionPlan } from "../domain/distribution-plan";
import { BudgetDto } from "../domain/planning.types";
import { calculateBudgetDistributionMetrics } from "../domain/budget-distribution-metrics";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { Button } from "@/shared/ui/button";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";

export interface BudgetDistributionCardProps {
  plan?: DistributionPlan;
  monthlyIncome: number;
  budgets?: BudgetDto[];
  onOpenAdjustRule: () => void;
  formatMoney: (amount: number) => string;
}

const BUCKET_PALETTE = ["#10B981", "#06B6D4", "#A855F7", "#F59E0B", "#F43F5E", "#3B82F6", "#8B5CF6", "#EC4899"];

const comparisonChartConfig = {
  cupo: {
    label: "Cupo regla",
    color: "var(--primary)",
  },
  presupuestado: {
    label: "Presupuestado",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function BudgetDistributionCard({
  plan,
  monthlyIncome,
  budgets = [],
  onOpenAdjustRule,
  formatMoney,
}: BudgetDistributionCardProps) {
  const { findCategory } = useUserCategories();
  const [viewMode, setViewMode] = useState<"comparison" | "donut">("comparison");

  const metrics = useMemo(() => {
    return calculateBudgetDistributionMetrics({
      plan,
      monthlyIncome,
      budgets,
      getCategoryName: (id) => findCategory(id)?.name || id,
    });
  }, [plan, monthlyIncome, budgets, findCategory]);

  const ruleLabel = useMemo(() => {
    if (!plan?.enabled || !plan.buckets?.length) {
      return "Regla 50/30/20 (personalizable)";
    }
    const pStr = plan.buckets.map((b) => b.percent).join("/");
    return `Regla ${pStr} (personalizable)`;
  }, [plan]);

  // Data for Donut Chart
  const donutData = useMemo(() => {
    return metrics.groups.map((g, idx) => ({
      name: g.name,
      value: g.percent,
      amount: g.targetAmount,
      color: BUCKET_PALETTE[idx % BUCKET_PALETTE.length],
    }));
  }, [metrics.groups]);

  // Data for Comparative Bar Chart (shadcn)
  const barChartData = useMemo(() => {
    return metrics.groups.map((g) => ({
      name: g.name,
      cupo: Math.round(g.targetAmount),
      presupuestado: Math.round(g.budgetedAmount),
      isOver: g.isOverBudgeted,
    }));
  }, [metrics.groups]);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-2xs flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
              Distribución del presupuesto
            </h2>
            {metrics.hasAnyOverrun && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Excedido en {formatMoney(metrics.totalOverrunAmount)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{ruleLabel}</span>
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 cursor-help" />
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View mode toggle */}
          <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border">
            <button
              type="button"
              onClick={() => setViewMode("comparison")}
              aria-label="Ver comparativa de presupuestos"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === "comparison"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Comparativa</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("donut")}
              aria-label="Ver porcentajes de ingresos"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === "donut"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Porcentajes</span>
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenAdjustRule}
            className="h-8 px-3 rounded-xl border-border bg-background hover:bg-muted text-xs font-bold gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Ajustar regla</span>
          </Button>
        </div>
      </div>

      {/* Main Visual: Comparative Bar Chart OR Donut */}
      {viewMode === "comparison" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Comparativa: Cupo según sueldo vs. Suma de presupuestos por categoría</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary/45" /> Cupo regla
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#06b6d4]" /> Presupuestado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Excedido
              </span>
            </div>
          </div>

          <ChartContainer config={comparisonChartConfig} className="h-52 w-full">
            <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 600 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="cupo" name="Cupo regla" fill="var(--primary)" opacity={0.4} radius={[5, 5, 0, 0]} />
              <Bar dataKey="presupuestado" name="Presupuestado" radius={[5, 5, 0, 0]}>
                {barChartData.map((entry, index) => (
                  <Cell key={`bar-cell-${index}`} fill={entry.isOver ? "#f43f5e" : "#06b6d4"} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Donut Chart */}
          <div className="md:col-span-6 flex justify-center">
            <div className="relative w-[190px] h-[190px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={84}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => `${val}%`}
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      borderColor: "var(--border)",
                      color: "var(--popover-foreground)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                    itemStyle={{ color: "var(--popover-foreground)" }}
                    labelStyle={{ color: "var(--popover-foreground)" }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                <span className="text-lg font-black text-foreground font-mono tracking-tight leading-tight">
                  {formatMoney(monthlyIncome)}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                  Ingreso mensual
                </span>
              </div>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="md:col-span-6 flex flex-col gap-3 justify-center">
            {donutData.map((b) => (
              <div
                key={b.name}
                className="flex items-center justify-between gap-3 text-xs sm:text-sm font-medium"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: b.color }}
                  />
                  <span className="font-bold text-foreground shrink-0 font-mono w-9">
                    {b.value}%
                  </span>
                  <span className="text-muted-foreground truncate">{b.name}</span>
                </div>
                <span className="font-mono font-bold text-foreground shrink-0">
                  {formatMoney(b.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group Detail Cards: Cupo vs Presupuestado Breakdown */}
      <div className="flex flex-col gap-3 pt-2 border-t border-border/60">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Detalle por grupo de distribución
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {metrics.groups.map((g, idx) => {
            const color = BUCKET_PALETTE[idx % BUCKET_PALETTE.length];
            const isTargetOnly = g.trackingMode === "TargetOnly";
            const ratioClamped = Math.min(100, Math.round(g.budgetedRatio));

            return (
              <div
                key={g.id}
                className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all ${
                  g.isOverBudgeted
                    ? "bg-rose-500/5 border-rose-500/30"
                    : "bg-background/80 border-border"
                }`}
              >
                {/* Header of Group */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-extrabold text-foreground text-xs sm:text-sm truncate">
                      {g.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-muted-foreground shrink-0">
                    {g.percent}%
                  </span>
                </div>

                {/* Amounts: Cupo vs Presupuestado */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cupo asignado:</span>
                    <span className="font-mono font-bold text-foreground">
                      {formatMoney(g.targetAmount)}
                    </span>
                  </div>

                  {!isTargetOnly && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Presupuestado:</span>
                      <span
                        className={`font-mono font-bold ${
                          g.isOverBudgeted ? "text-rose-500" : "text-foreground"
                        }`}
                      >
                        {formatMoney(g.budgetedAmount)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress bar of Allocation */}
                {!isTargetOnly && (
                  <div className="w-full h-2 rounded-full bg-muted/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        g.isOverBudgeted ? "bg-rose-500" : "bg-primary"
                      }`}
                      style={{ width: `${ratioClamped}%` }}
                    />
                  </div>
                )}

                {/* Status pill / message */}
                <div className="pt-0.5">
                  {isTargetOnly ? (
                    <span className="text-[11px] text-muted-foreground italic">
                      Meta de ahorro (sin categorías)
                    </span>
                  ) : g.isOverBudgeted ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Excedido en {formatMoney(g.overBudgetedAmount)} ({Math.round(g.budgetedRatio)}%)
                    </span>
                  ) : g.budgetedAmount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      {formatMoney(g.targetAmount - g.budgetedAmount)} de margen ({Math.round(g.budgetedRatio)}% asignado)
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      Sin límites configurados
                    </span>
                  )}
                </div>

                {/* Categories assigned breakdown */}
                {g.categoryBudgets.length > 0 && (
                  <div className="pt-2 border-t border-border/50 flex flex-wrap gap-1.5">
                    {g.categoryBudgets.map((cb) => (
                      <span
                        key={cb.budgetId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 border border-border/60 text-[10px] sm:text-[11px] text-foreground font-medium"
                      >
                        <span className="truncate max-w-[90px]">{cb.categoryName}:</span>
                        <strong className="font-mono">{formatMoney(cb.limitAmount)}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Unassigned category budgets notification if any */}
        {metrics.unassignedCategoryBudgets.length > 0 && (
          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              Tenés presupuestos en categorías fuera de la regla ({metrics.unassignedCategoryBudgets.map((c) => c.categoryName).join(", ")})
            </span>
            <span className="font-mono font-bold text-foreground shrink-0">
              Total no asignado: {formatMoney(metrics.unassignedTotalLimit)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
