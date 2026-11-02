"use client";

import React, { useMemo } from "react";
import { CheckCircle2, TrendingUp, Lightbulb } from "lucide-react";
import { BudgetDto } from "../domain/planning.types";
import { DistributionPlan } from "../domain/distribution-plan";
import { calculateBudgetDistributionMetrics } from "../domain/budget-distribution-metrics";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";

interface BudgetInsightsCardProps {
  plan?: DistributionPlan;
  budgets: BudgetDto[];
  monthlyIncome: number;
  monthlyExpenses: number;
  formatMoney: (amount: number) => string;
}

export function BudgetInsightsCard({
  plan,
  budgets,
  monthlyIncome,
  monthlyExpenses,
  formatMoney,
}: BudgetInsightsCardProps) {
  const { findCategory } = useUserCategories();

  const insights = useMemo(() => {
    const list: { id: string; icon: "check" | "trend"; text: React.ReactNode }[] = [];

    // 0. Overrun warning in distribution plan
    if (plan && budgets.length > 0) {
      const distMetrics = calculateBudgetDistributionMetrics({
        plan,
        monthlyIncome,
        budgets,
        getCategoryName: (id) => findCategory(id)?.name || id,
      });
      const overGroup = distMetrics.groups.find((g) => g.isOverBudgeted);
      if (overGroup) {
        list.push({
          id: "dist-overrun",
          icon: "trend",
          text: (
            <span>
              Tus presupuestos en <strong>“{overGroup.name}”</strong> superan la regla por{" "}
              {formatMoney(overGroup.overBudgetedAmount)}. Podés moderar topes o ajustar el porcentaje.
            </span>
          ),
        });
      }
    }

    // 1. Healthy category within budget
    const safeBudgets = budgets.filter((b) => {
      const limit = Number(b.limitAmount) || 0;
      const spent = Number(b.spentAmount) || 0;
      return limit > 0 && spent <= limit * 0.8;
    });

    if (safeBudgets.length > 0) {
      const b = safeBudgets[0];
      const name = b.categoryId ? findCategory(b.categoryId)?.name || "Gastos generales" : "Gastos generales";
      list.push({
        id: "safe-cat",
        icon: "check",
        text: (
          <span>
            Tus gastos en <strong>“{name}”</strong> están dentro del presupuesto.
          </span>
        ),
      });
    } else if (budgets.length > 0) {
      const b = budgets[0];
      const name = b.categoryId ? findCategory(b.categoryId)?.name || "Gastos generales" : "Gastos generales";
      list.push({
        id: "first-cat",
        icon: "check",
        text: (
          <span>
            Seguimiento activo en <strong>“{name}”</strong> para el mes en curso.
          </span>
        ),
      });
    } else {
      list.push({
        id: "no-budgets",
        icon: "check",
        text: <span>Creá presupuestos por categoría para recibir alertas preventivas.</span>,
      });
    }

    // 2. High usage category or optimization advice
    const highUsage = budgets.find((b) => {
      const limit = Number(b.limitAmount) || 0;
      const spent = Number(b.spentAmount) || 0;
      return limit > 0 && spent > limit * 0.75;
    });

    if (highUsage) {
      const name = highUsage.categoryId ? findCategory(highUsage.categoryId)?.name || "Gastos" : "Gastos";
      const spent = Number(highUsage.spentAmount) || 0;
      const potentialReduction = Math.round(spent * 0.15);
      list.push({
        id: "reduction-tip",
        icon: "check",
        text: (
          <span>
            Puedes reducir {formatMoney(potentialReduction)} en <strong>“{name}”</strong> (revisar consumos no esenciales).
          </span>
        ),
      });
    } else {
      list.push({
        id: "general-tip",
        icon: "check",
        text: <span>Revisá suscripciones recurrentes para optimizar gastos fijos no utilizados.</span>,
      });
    }

    // 3. Projected savings rate
    const savings = Math.max(0, monthlyIncome - monthlyExpenses);
    const savingsRate = monthlyIncome > 0 ? ((savings / monthlyIncome) * 100).toFixed(1) : "0.0";
    list.push({
      id: "savings-rate",
      icon: "trend",
      text: (
        <span>
          Si mantienes el ritmo, cerrarás el mes con un ahorro del <strong>{savingsRate}%</strong>.
        </span>
      ),
    });

    return list;
  }, [plan, budgets, monthlyIncome, monthlyExpenses, findCategory, formatMoney]);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-2xs flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-400" />
        <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
          Insights y recomendaciones
        </h2>
      </div>

      {/* Bullets */}
      <div className="flex flex-col gap-3">
        {insights.map((item) => (
          <div key={item.id} className="flex items-start gap-3 text-xs sm:text-sm text-foreground">
            {item.icon === "check" ? (
              <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            )}
            <p className="leading-snug text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
