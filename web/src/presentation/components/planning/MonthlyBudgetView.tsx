"use client";

import { PieChart, Plus } from "lucide-react";
import { BudgetDto } from "@/domain/models/types";
import { BudgetMetrics } from "@/application/hooks/useFinancialMetrics";

interface MonthlyBudgetViewProps {
  budgets: BudgetDto[];
  metrics: BudgetMetrics;
  onOpenCreateBudgetModal: () => void;
}

export function MonthlyBudgetView({
  budgets,
  metrics,
  onOpenCreateBudgetModal,
}: MonthlyBudgetViewProps) {
  const getCategoryEmoji = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes("alimento") || c.includes("comida") || c.includes("super")) return "🍔";
    if (c.includes("transporte") || c.includes("gasolina") || c.includes("auto")) return "🚗";
    if (c.includes("vivienda") || c.includes("alquiler") || c.includes("casa")) return "🏠";
    if (c.includes("ocio") || c.includes("salida") || c.includes("diversion")) return "🎉";
    if (c.includes("salud") || c.includes("farmacia")) return "💊";
    return "💡";
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 100) {
      return <span className="text-[10px] font-[700] text-[#EF4444]">Tope Alcanzado</span>;
    }
    if (percentage >= 80) {
      return <span className="text-[10px] font-[700] text-[#F59E0B]">Alerta 80% ⚠️</span>;
    }
    return <span className="text-[10px] font-[700] text-[#2563EB]">Normal</span>;
  };

  const getProgressBg = (percentage: number) => {
    if (percentage >= 100) return "bg-[#EF4444]";
    if (percentage >= 80) return "bg-[#F59E0B]";
    return "bg-[#2563EB]";
  };

  const now = new Date();
  const currentMonthLabel =
    now.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).charAt(0).toUpperCase() +
    now.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).slice(1);

  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(0, lastDayOfMonth - now.getDate());

  return (
    <div className="w-full max-w-[1100px] p-[28px_32px_40px_32px] rounded-[20px] bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-[22px]">
      {/* Header (OpenPencil BHHead) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left (OpenPencil BHHeadL) */}
        <div className="flex items-center gap-3">
          <div className="w-[40px] h-[40px] rounded-[10px] bg-[#0F172A] text-white flex items-center justify-center shrink-0">
            <PieChart className="w-[18px] h-[18px]" />
          </div>
          <div>
            <h1 className="text-[18px] font-[900] text-[#0F172A] tracking-tight">
              Presupuestos Mensuales & Límites de Gasto
            </h1>
            <p className="text-[12px] font-[500] text-[#64748B] mt-0.5">
              Límites por categoría con alertas al 80% y 100% en moneda boliviana
            </p>
          </div>
        </div>

        {/* Right (OpenPencil BHActions) */}
        <div className="flex items-center gap-2.5">
          <div className="h-[38px] px-3.5 rounded-[10px] border border-[#E2E8F0] bg-white text-[12px] font-[700] text-[#0F172A] flex items-center select-none shadow-2xs">
            {currentMonthLabel}
          </div>
          <button
            onClick={onOpenCreateBudgetModal}
            className="h-[38px] px-4 rounded-[10px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-[12px] font-[700] transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Presupuesto</span>
          </button>
        </div>
      </div>

      {/* 3 KPI Summary Cards (OpenPencil BKpiRow) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 0: Tope Total del Mes */}
        <div className="p-4 rounded-[14px] bg-white border border-[#E2E8F0] flex flex-col gap-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[700] text-[#64748B]">Tope Total del Mes</span>
            <span className="text-[9px] font-[800] text-[#2563EB]">Asignado</span>
          </div>
          <div className="text-[22px] font-[900] text-[#0F172A] font-mono">
            Bs. {metrics.totalLimitBob}
          </div>
          <p className="text-[11px] font-[500] text-[#94A3B8]">Límite asignado</p>
        </div>

        {/* Card 1: Gastado en el Mes */}
        <div className="p-4 rounded-[14px] bg-white border border-[#E2E8F0] flex flex-col gap-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[700] text-[#64748B]">Gastado este Mes</span>
            <span
              className={`text-[9px] font-[800] ${
                metrics.spentRatioPercentage >= 100
                  ? "text-[#EF4444]"
                  : metrics.spentRatioPercentage >= 80
                  ? "text-[#F59E0B]"
                  : "text-[#10B981]"
              }`}
            >
              {metrics.spentRatioPercentage >= 100
                ? "Tope Alcanzado"
                : metrics.spentRatioPercentage >= 80
                ? "Alerta 80%"
                : "Normal"}
            </span>
          </div>
          <div className="text-[22px] font-[900] text-[#0F172A] font-mono">
            Bs. {metrics.totalSpentBob}
          </div>
          <p className="text-[11px] font-[500] text-[#94A3B8]">
            {metrics.spentRatioPercentage.toFixed(1)}% del tope
          </p>
        </div>

        {/* Card 2: Ritmo Seguro Diario */}
        <div className="p-4 rounded-[14px] bg-white border border-[#E2E8F0] flex flex-col gap-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[700] text-[#64748B]">Ritmo Seguro Diario</span>
            <span className="text-[9px] font-[800] text-[#059669]">Ritmo Seguro</span>
          </div>
          <div className="text-[22px] font-[900] text-[#0F172A] font-mono">
            Bs. {metrics.safeDailyRhythmBob} / día
          </div>
          <p className="text-[11px] font-[500] text-[#94A3B8]">
            {daysRemainingInMonth} días restantes en el mes
          </p>
        </div>
      </div>

      {/* Table Section (OpenPencil BTableBox) */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[14px] font-[800] text-[#0F172A]">
          Límites Activos por Categoría
        </h2>

        <div className="overflow-x-auto">
          <div className="min-w-[620px] flex flex-col">
            {/* Columns Header (OpenPencil BColsHeader) */}
            <div className="grid grid-cols-12 gap-2 px-2 py-2 text-[10px] font-[700] text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">
              <div className="col-span-3">Categoría</div>
              <div className="col-span-3">Consumido / Tope</div>
              <div className="col-span-3">Barra de Consumo</div>
              <div className="col-span-2 text-center">Estado / Alerta</div>
              <div className="col-span-1 text-right">Disponible</div>
            </div>

            {/* Data Rows (OpenPencil BDataRow_0, 1, 2, 3) */}
            <div className="flex flex-col divide-y divide-[#E2E8F0]">
              {budgets.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No tienes presupuestos activos. Creá uno con &quot;+ Crear Presupuesto&quot;.
                </div>
              ) : (
                budgets.map((b) => {
                  const spent = b.spentAmount;
                  const limit = b.limitAmount;
                  const available = Math.max(0, limit - spent);
                  const percentage = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
                  const categoryName = b.categoryId || "Gastos Generales";
                  const emoji = getCategoryEmoji(categoryName);

                  return (
                    <div
                      key={b.id}
                      className="grid grid-cols-12 gap-2 px-2 py-3.5 items-center hover:bg-slate-50/70 transition"
                    >
                      {/* Categoría */}
                      <div className="col-span-3 flex items-center gap-1.5 text-[13px] font-[700] text-[#0F172A] truncate">
                        <span>{emoji}</span>
                        <span className="truncate">{categoryName}</span>
                      </div>

                      {/* Consumido / Tope */}
                      <div className="col-span-3 text-[12px] font-[800] text-[#0F172A] font-mono">
                        Bs {spent.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                        <span className="text-[#64748B] font-[600]">
                          / Bs {limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Barra de Consumo */}
                      <div className="col-span-3 flex items-center gap-2">
                        <div className="flex-1 h-[6px] rounded-full bg-[#E2E8F0] overflow-hidden">
                          <div
                            className={`h-full ${getProgressBg(percentage)} transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-[#64748B] w-8 text-right font-mono">
                          {percentage}%
                        </span>
                      </div>

                      {/* Estado / Alerta */}
                      <div className="col-span-2 text-center">
                        {getStatusBadge(percentage)}
                      </div>

                      {/* Disponible */}
                      <div className="col-span-1 text-right text-[12px] font-[700] text-[#10B981] font-mono">
                        Bs {available.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
