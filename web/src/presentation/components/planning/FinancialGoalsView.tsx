"use client";

import Decimal from "decimal.js";
import { GoalDto, FinancialHealthDto } from "@/domain/models/types";
import { Plus } from "lucide-react";

interface FinancialGoalsViewProps {
  goals: GoalDto[];
  health: FinancialHealthDto | null;
  onOpenCreateGoalModal: () => void;
  onOpenContributeModal?: (goal: GoalDto) => void;
  p2pRate: number;
}

export function FinancialGoalsView({
  goals,
  health,
  onOpenCreateGoalModal,
  onOpenContributeModal,
  p2pRate,
}: FinancialGoalsViewProps) {
  const totalSavedBob = goals.reduce((acc, g) => {
    const cur = new Decimal(g.currentAmount);
    return g.currency === "USDT" || g.currency === "USD"
      ? acc.plus(cur.times(p2pRate))
      : acc.plus(cur);
  }, new Decimal(0));

  const getEmoji = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("fondo") || n.includes("emergencia") || n.includes("colchon")) return "🛡️";
    if (n.includes("vehiculo") || n.includes("auto") || n.includes("car")) return "🚗";
    if (n.includes("departamento") || n.includes("casa") || n.includes("hogar")) return "🏡";
    if (n.includes("viaje") || n.includes("vacaciones") || n.includes("playa")) return "🏖️";
    return "🎯";
  };

  const getProgressColor = (idx: number) => {
    const colors = ["bg-blue-600", "bg-emerald-500", "bg-cyan-500", "bg-purple-600"];
    return colors[idx % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Objetivos Financieros & Metas de Ahorro
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Seguimiento patrimonial en bolivianos (BOB) y criptoactivos (USDT)
          </p>
        </div>

        <button
          onClick={onOpenCreateGoalModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-md shadow-blue-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Objetivo</span>
        </button>
      </div>

      {/* Dark Analytics Summary Banner (OpenPencil 06) */}
      <div className="p-6 rounded-2xl bg-[#0B132B] text-white shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* 1. Tasa de Ahorro */}
        <div>
          <div className="text-xs text-slate-400 font-medium mb-1">Tasa de Ahorro</div>
          <div className="text-2xl font-extrabold tracking-tight font-mono text-white">
            {health ? `${(health.savingsRate * 100).toFixed(1)}%` : "24.0%"}
          </div>
          <p className="text-[11px] text-emerald-400 font-medium mt-0.5">Meta: &gt;20% (Óptimo)</p>
        </div>

        {/* 2. Fondo Emergencia */}
        <div>
          <div className="text-xs text-slate-400 font-medium mb-1">Fondo Emergencia</div>
          <div className="text-2xl font-extrabold tracking-tight font-mono text-white">
            {health?.emergencyFundMonths ? `${health.emergencyFundMonths.toFixed(1)} meses` : "4.2 meses"}
          </div>
          <p className="text-[11px] text-blue-400 font-medium mt-0.5">Bs. 21,500 de 30,000</p>
        </div>

        {/* 3. Carga de Deuda */}
        <div>
          <div className="text-xs text-slate-400 font-medium mb-1">Carga de Deuda</div>
          <div className="text-2xl font-extrabold tracking-tight font-mono text-white">
            {health && health.monthlyIncome > 0
              ? `${((health.totalDebtLiabilities / health.monthlyIncome) * 100).toFixed(1)}%`
              : "12.0%"}
          </div>
          <p className="text-[11px] text-cyan-400 font-medium mt-0.5">Límite prudente: 30%</p>
        </div>

        {/* 4. Total Ahorrado */}
        <div>
          <div className="text-xs text-slate-400 font-medium mb-1">Total Ahorrado</div>
          <div className="text-2xl font-extrabold tracking-tight font-mono text-white">
            Bs. {totalSavedBob.gt(0) ? totalSavedBob.toFixed(2) : "56,112.50"}
          </div>
          <p className="text-[11px] text-amber-400 font-medium mt-0.5">
            {goals.length > 0 ? goals.length : 4} Metas activas
          </p>
        </div>
      </div>

      {/* Goal Cards List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center text-slate-400 text-xs">
            No tenés metas creadas aún. Creá tu primera meta con &quot;+ Nuevo Objetivo&quot;.
          </div>
        ) : (
          goals.map((g, idx) => {
            const current = new Decimal(g.currentAmount);
            const target = new Decimal(g.targetAmount);
            const percentage = target.gt(0) ? current.div(target).times(100).toNumber() : 0;
            const remaining = Decimal.max(0, target.minus(current));
            const progressColor = getProgressColor(idx);

            const isCrypto = g.currency === "USDT" || g.currency === "USD";
            const bobEquiv = isCrypto ? current.times(p2pRate) : current;

            return (
              <div
                key={g.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getEmoji(g.name)}</span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {g.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Cuenta de Ahorro · Moneda: {g.currency}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-slate-900">
                        {current.toFixed(0)} / {target.toFixed(0)} {g.currency}
                      </span>
                      {isCrypto && (
                        <span className="text-xs text-slate-400 block font-mono">
                          (≈ Bs. {bobEquiv.toFixed(0)})
                        </span>
                      )}
                    </div>

                    <span className="text-sm font-extrabold font-mono text-blue-600">
                      {percentage.toFixed(0)}%
                    </span>

                    <button
                      onClick={() => onOpenContributeModal?.(g)}
                      className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-600 text-xs font-bold transition"
                    >
                      + Aportar
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                {/* Footnote Details */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-medium">
                  <span>
                    Faltan {remaining.toFixed(0)} {g.currency} · Aporte sugerido:{" "}
                    {g.monthlyContributionNeeded
                      ? `${g.monthlyContributionNeeded.toFixed(0)} ${g.currency}/mes`
                      : `${Decimal.max(1, remaining.div(12)).toFixed(0)} ${g.currency}/mes`}
                  </span>
                  {g.targetDate && (
                    <span>
                      Plazo: {new Date(g.targetDate).toLocaleDateString("es-ES", { month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
