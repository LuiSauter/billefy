"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Lightbulb, ArrowRight, Target } from "lucide-react";
import { GoalDto } from "../domain/planning.types";
import { Amount } from "@/shared/ui/amount";
import { formatPercent } from "@/shared/lib/amount-format";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";

interface GoalsSummaryPanelProps {
  goals: GoalDto[];
  currency: string;
  onOpenPlan?: () => void;
}

export function GoalsSummaryPanel({
  goals,
  currency,
  onOpenPlan,
}: GoalsSummaryPanelProps) {
  const preferences = useNumberPreferences();
  const totalTarget = goals.reduce((acc, g) => acc + (Number(g.targetAmount) || 0), 0);
  const totalCurrent = goals.reduce((acc, g) => acc + (Number(g.currentAmount) || 0), 0);
  const activeCount = goals.filter((g) => (g.percentageAchieved ?? 0) < 100).length;

  const chartData = useMemo(() => {
    if (goals.length === 0) {
      return [{ name: "Sin metas", value: 100, color: "#1E293B", percentage: 0 }];
    }
    const colors = ["#10B981", "#8B5CF6", "#38BDF8", "#64748B", "#F59E0B", "#CBD5E1", "#EC4899"];
    return goals.map((g, idx) => ({
      name: g.name.split(" ")[0],
      value: Math.min(100, Math.max(5, Math.round(g.percentageAchieved ?? 0))),
      color: colors[idx % colors.length],
      percentage: Math.round(g.percentageAchieved ?? 0),
    }));
  }, [goals]);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Resumen de metas (Donut Chart) */}
      <div className="bg-card border border-border rounded-[20px] p-5 flex flex-col gap-4 shadow-sm">
        <h2 className="text-base font-black text-foreground tracking-tight">
          Resumen de metas
        </h2>

        <div className="flex items-center justify-between gap-4">
          {/* Donut Chart */}
          <div className="relative w-[150px] h-[150px] flex items-center justify-center shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={goals.length > 1 ? 3 : 0}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
              <span className="text-[11px] font-medium text-muted-foreground leading-tight">
                {activeCount} {activeCount === 1 ? "meta activa" : "metas activas"}
              </span>
              <Amount value={totalCurrent} currency={currency} size="md" className="leading-tight my-0.5" />
              <span className="text-[10px] text-muted-foreground">de <Amount value={totalTarget} currency={currency} size="xs" /></span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2 flex-1 justify-center min-w-0">
            {goals.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin metas registradas</p>
            ) : (
              chartData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-2 text-xs font-medium"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-foreground/80 truncate text-[11px] font-medium">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-bold text-foreground text-[11px] shrink-0">
                    {formatPercent(item.percentage, preferences)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. Distribución de ahorro */}
      <div className="bg-card border border-border rounded-[20px] p-5 flex flex-col gap-4 shadow-sm">
        <h2 className="text-base font-black text-foreground tracking-tight">
          Distribución de ahorro
        </h2>

        <div className="flex flex-col gap-3.5">
          {goals.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No tienes metas de ahorro registradas.
            </p>
          ) : (
            goals
              .filter(
                (g) =>
                  (g.monthlyContributionNeeded ?? 0) > 0 ||
                  (g.percentageAchieved ?? 0) < 100
              )
              .map((item) => {
                const monthlyAmount = item.monthlyContributionNeeded ?? 0;
                const progress = Math.min(100, Math.round(item.percentageAchieved ?? 0));

                return (
                  <div key={item.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                          <Target className="w-3 h-3" />
                        </div>
                        <span className="font-bold text-foreground truncate max-w-[140px]">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-bold text-foreground text-xs whitespace-nowrap shrink-0">
                        <Amount value={monthlyAmount} currency={item.currency} size="xs" /> / mes
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* 3. Recomendación */}
      <div className="bg-card border border-border rounded-[20px] p-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
          <h3 className="text-sm font-black text-foreground tracking-tight">
            Recomendación
          </h3>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {goals.length > 0
            ? "Mantené tu ritmo de ahorro en tus cuentas para cumplir con las fechas objetivo de tus metas."
            : "Creá tu primera meta de ahorro vinculándola a una de tus cuentas para dar seguimiento a tu progreso."}
        </p>

        {onOpenPlan && (
          <button
            type="button"
            onClick={onOpenPlan}
            className="w-full h-10 mt-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Ver plan de ahorro</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
