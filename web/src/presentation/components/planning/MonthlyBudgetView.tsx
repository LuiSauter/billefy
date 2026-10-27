"use client";

import { useState } from "react";
import Decimal from "decimal.js";
import { PieChart, Plus, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { BudgetDto } from "@/domain/models/types";

interface MonthlyBudgetViewProps {
  budgets: BudgetDto[];
  onOpenCreateBudgetModal: () => void;
}

export function MonthlyBudgetView({
  budgets,
  onOpenCreateBudgetModal,
}: MonthlyBudgetViewProps) {
  const [selectedMonth] = useState("Mayo 2025");

  // Calculate totals
  const totalLimit = budgets.reduce(
    (acc, b) => acc.plus(new Decimal(b.limitAmount)),
    new Decimal(0)
  );
  const totalSpent = budgets.reduce(
    (acc, b) => acc.plus(new Decimal(b.spentAmount)),
    new Decimal(0)
  );

  const spentRatio = totalLimit.gt(0)
    ? totalSpent.div(totalLimit).times(100).toNumber()
    : 0;

  // Safe daily rhythm for remaining 19 days
  const remainingDays = 19;
  const remainingBudget = Decimal.max(0, totalLimit.minus(totalSpent));
  const safeDailyRhythm = totalLimit.gt(0)
    ? remainingBudget.div(remainingDays)
    : new Decimal(200);

  const getCategoryEmoji = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes("alimento") || c.includes("comida") || c.includes("super")) return "🍔";
    if (c.includes("transporte") || c.includes("gasolina") || c.includes("auto")) return "🚗";
    if (c.includes("vivienda") || c.includes("alquiler") || c.includes("casa")) return "🏠";
    if (c.includes("ocio") || c.includes("salida") || c.includes("diversion")) return "🎉";
    if (c.includes("salud") || c.includes("farmacia")) return "💊";
    return "💡";
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return "bg-rose-500";
    if (percentage >= 80) return "bg-amber-500";
    return "bg-blue-600";
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Presupuestos Mensuales & Límites de Gasto
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Límites por categoría con alertas al 80% y 100% en moneda boliviana
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50">
            {selectedMonth} ▼
          </div>
          <button
            onClick={onOpenCreateBudgetModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-md shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Presupuesto</span>
          </button>
        </div>
      </div>

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Tope Total del Mes */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Tope Total del Mes</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
              Asignado
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            Bs. {totalLimit.gt(0) ? totalLimit.toFixed(2) : "18,000.00"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Límite asignado</p>
        </div>

        {/* 2. Gastado en Mayo */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Gastado en el Mes</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                spentRatio >= 100
                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                  : spentRatio >= 80
                  ? "bg-amber-50 text-amber-600 border border-amber-200"
                  : "bg-emerald-50 text-emerald-600 border border-emerald-200"
              }`}
            >
              {spentRatio >= 100 ? "Tope Alcanzado" : spentRatio >= 80 ? "Alerta 80%" : "Normal"}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            Bs. {totalSpent.gt(0) ? totalSpent.toFixed(2) : "14,200.00"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {spentRatio > 0 ? spentRatio.toFixed(1) : "78.8"}% del tope
          </p>
        </div>

        {/* 3. Ritmo Seguro Diario */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Ritmo Seguro Diario</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
              Ritmo Seguro
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            Bs. {safeDailyRhythm.toFixed(2)} / día
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{remainingDays} días restantes</p>
        </div>
      </div>

      {/* Table: Límites Activos por Categoría */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 tracking-tight mb-4">
          Límites Activos por Categoría
        </h2>

        {budgets.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No tenés presupuestos asignados para este mes. Hacé clic en &quot;+ Crear Presupuesto&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3">Consumido / Tope</th>
                  <th className="py-3 px-3 w-1/3">Barra de Consumo</th>
                  <th className="py-3 px-3 text-center">Estado / Alerta</th>
                  <th className="py-3 px-3 text-right">Disponible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {budgets.map((b) => {
                  const spent = new Decimal(b.spentAmount);
                  const limit = new Decimal(b.limitAmount);
                  const available = Decimal.max(0, limit.minus(spent));
                  const percentage = limit.gt(0) ? spent.div(limit).times(100).toNumber() : 0;
                  const progressColor = getProgressBarColor(percentage);
                  const categoryName = b.categoryId || "Gastos Generales";

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      {/* Categoría */}
                      <td className="py-4 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <span>{getCategoryEmoji(categoryName)}</span>
                        <span>{categoryName}</span>
                      </td>

                      {/* Consumido / Tope */}
                      <td className="py-4 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        Bs {spent.toFixed(2)} / Bs {limit.toFixed(2)}
                      </td>

                      {/* Barra de Consumo */}
                      <td className="py-4 px-3">
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </td>

                      {/* Estado / Alerta */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        {percentage >= 100 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            <span>Tope Alcanzado</span>
                          </span>
                        ) : percentage >= 80 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Alerta 80% ⚠</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Normal</span>
                          </span>
                        )}
                      </td>

                      {/* Disponible */}
                      <td className="py-4 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        Bs {available.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
