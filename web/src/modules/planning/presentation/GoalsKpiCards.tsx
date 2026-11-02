"use client";

import React from "react";
import { Target, TrendingUp, Calendar, Trophy, Plane } from "lucide-react";
import { GoalDto } from "../domain/planning.types";

interface GoalsKpiCardsProps {
  goals: GoalDto[];
  formatMoney: (amount: number) => string;
}

export function GoalsKpiCards({ goals, formatMoney }: GoalsKpiCardsProps) {
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => (g.percentageAchieved ?? 0) >= 100).length;
  const activeGoals = totalGoals - completedGoals;

  const avgProgress =
    totalGoals > 0
      ? Math.round(
          goals.reduce((acc, g) => acc + (g.percentageAchieved ?? 0), 0) / totalGoals
        )
      : 0;

  const totalMonthlySavings = goals.reduce(
    (acc, g) => acc + (g.monthlyContributionNeeded ?? 0),
    0
  );

  const activeGoalsList = goals.filter((g) => (g.percentageAchieved ?? 0) < 100);
  const closestGoal = activeGoalsList.sort(
    (a, b) => (a.monthsRemaining ?? 999) - (b.monthsRemaining ?? 999)
  )[0];

  const closestName = closestGoal ? closestGoal.name : "Sin metas activas";
  const closestMonths = closestGoal
    ? closestGoal.monthsRemaining
      ? `${closestGoal.monthsRemaining} meses restantes`
      : "En seguimiento"
    : "Sin fecha definida";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Metas activas */}
      <div className="p-5 rounded-[20px] bg-[#131B2E] border border-[#1E293B] flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
          <Target className="w-6 h-6" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-slate-400 truncate">
            Metas activas
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-black text-white font-mono">
              {activeGoals}
            </span>
            <span className="text-xs font-medium text-slate-400 font-mono">
              de {totalGoals} totales
            </span>
          </div>
        </div>
      </div>

      {/* 2. Progreso promedio */}
      <div className="p-5 rounded-[20px] bg-[#131B2E] border border-[#1E293B] flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-400 truncate">
              Progreso promedio
            </span>
            <span className="text-2xl font-black text-white font-mono mt-0.5">
              {avgProgress}%
            </span>
          </div>
        </div>

        {/* Circular Mini Progress Ring */}
        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#1E293B"
              strokeWidth="3.5"
            />
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#10B981"
              strokeWidth="3.5"
              strokeDasharray={88}
              strokeDashoffset={88 - (88 * avgProgress) / 100}
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* 3. Ahorro mensual total */}
      <div className="p-5 rounded-[20px] bg-[#131B2E] border border-[#1E293B] flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
          <Calendar className="w-6 h-6" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-slate-400 truncate">
            Ahorro mensual total
          </span>
          <span className="text-2xl font-black text-white font-mono mt-0.5">
            {formatMoney(totalMonthlySavings)}
          </span>
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
            {totalMonthlySavings > 0
              ? "Requerido para cumplir objetivos"
              : "Sin ahorro programado"}
          </span>
        </div>
      </div>

      {/* 4. Meta más cercana */}
      <div className="p-5 rounded-[20px] bg-[#131B2E] border border-[#1E293B] flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
          <Trophy className="w-6 h-6" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-slate-400 truncate">
            Meta más cercana
          </span>
          <span className="text-[15px] font-black text-white truncate mt-0.5">
            {closestName}
          </span>
          <span className="text-[11px] font-semibold text-sky-400 flex items-center gap-1 mt-0.5">
            <Plane className="w-3.5 h-3.5 shrink-0" />
            <span>{closestMonths}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
