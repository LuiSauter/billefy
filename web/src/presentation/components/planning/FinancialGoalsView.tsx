"use client";

import Decimal from "decimal.js";
import { GoalDto, FinancialHealthDto } from "@/domain/models/types";
import { Plus } from "lucide-react";

interface FinancialGoalsViewProps {
  goals: GoalDto[];
  health: FinancialHealthDto | null;
  totalSavedBob: string;
  onOpenCreateGoalModal: () => void;
  onOpenContributeModal?: (goal: GoalDto) => void;
  p2pRate: number;
}

export function FinancialGoalsView({
  goals,
  health,
  totalSavedBob,
  onOpenCreateGoalModal,
  onOpenContributeModal,
}: FinancialGoalsViewProps) {
  const getEmoji = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("fondo") || n.includes("emergencia") || n.includes("colchon")) return "🛡️";
    if (n.includes("vehiculo") || n.includes("auto") || n.includes("car")) return "🚗";
    if (n.includes("departamento") || n.includes("casa") || n.includes("hogar")) return "🏡";
    if (n.includes("viaje") || n.includes("vacaciones") || n.includes("playa")) return "🏖️";
    return "🎯";
  };

  const getProgressColor = (idx: number) => {
    const colors = ["bg-[#2563EB]", "bg-[#10B981]", "bg-[#3B82F6]", "bg-[#8B5CF6]"];
    return colors[idx % colors.length];
  };

  const getPercentageColor = (idx: number) => {
    const colors = ["text-[#2563EB]", "text-[#10B981]", "text-[#3B82F6]", "text-[#8B5CF6]"];
    return colors[idx % colors.length];
  };

  return (
    <div className="w-full max-w-[880px] p-[24px_24px_32px_24px] rounded-[24px] bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-[18px]">
      {/* Header (OpenPencil GMWH) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-[900] text-[#0F172A] tracking-tight">
            Objetivos Financieros & Metas de Ahorro
          </h1>
          <p className="text-[11px] font-[500] text-[#64748B] mt-0.5">
            Seguimiento patrimonial en bolivianos (BOB) y criptoactivos (USDT)
          </p>
        </div>

        <button
          onClick={onOpenCreateGoalModal}
          className="h-[38px] px-4 rounded-[10px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-[12px] font-[800] transition flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Objetivo</span>
        </button>
      </div>

      {/* Dark Slate Summary Banner (OpenPencil SFWCard) */}
      <div className="p-4 rounded-[16px] bg-[#0F172A] text-white shadow-md grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Col 0: Tasa de Ahorro */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Tasa de Ahorro</span>
          <span className="text-[20px] font-[900] text-white font-mono">
            {health ? `${(health.savingsRate * 100).toFixed(1)}%` : "0.0%"}
          </span>
          <span className="text-[10px] font-[500] text-[#34D399]">Meta: &gt;20%</span>
        </div>

        {/* Col 1: Fondo Emergencia */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Fondo Emergencia</span>
          <span className="text-[20px] font-[900] text-white font-mono">
            {health?.emergencyFundMonths ? `${health.emergencyFundMonths.toFixed(1)} meses` : "0.0 meses"}
          </span>
          <span className="text-[10px] font-[500] text-[#60A5FA]">Objetivo 3 a 6 meses</span>
        </div>

        {/* Col 2: Carga de Deuda */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Carga de Deuda</span>
          <span className="text-[20px] font-[900] text-white font-mono">
            {health && health.monthlyIncome > 0
              ? `${((health.totalDebtLiabilities / health.monthlyIncome) * 100).toFixed(1)}%`
              : "0.0%"}
          </span>
          <span className="text-[10px] font-[500] text-[#34D399]">Límite prudente: 30%</span>
        </div>

        {/* Col 3: Total Ahorrado */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Total Asignado a Metas</span>
          <span className="text-[20px] font-[900] text-white font-mono">
            Bs. {totalSavedBob}
          </span>
          <span className="text-[10px] font-[500] text-[#FCD34D]">
            {goals.length} {goals.length === 1 ? "Meta activa" : "Metas activas"}
          </span>
        </div>
      </div>

      {/* Goal Cards List (OpenPencil GWItem_0, 1, 2, 3) */}
      <div className="flex flex-col gap-3">
        {goals.length === 0 ? (
          <div className="p-8 rounded-[16px] bg-white border border-[#E2E8F0] text-center text-[#64748B] text-xs space-y-2">
            <p className="font-semibold text-slate-700">No tenés metas de ahorro creadas todavía.</p>
            <p className="text-slate-500 max-w-sm mx-auto">
              Definí objetivos como tu fondo de emergencia, vehículo o vacaciones para proyectar tu ahorro mes a mes.
            </p>
            <button
              onClick={onOpenCreateGoalModal}
              className="mt-2 text-[#2563EB] font-bold text-xs hover:underline"
            >
              + Crear mi primera meta
            </button>
          </div>
        ) : (
          goals.map((g, idx) => {
            const current = new Decimal(g.currentAmount);
            const target = new Decimal(g.targetAmount);
            const percentage = target.gt(0) ? Math.min(100, Math.round(current.div(target).times(100).toNumber())) : 0;
            const remaining = Decimal.max(0, target.minus(current));
            const progressColor = getProgressColor(idx);
            const percentColor = getPercentageColor(idx);

            const isCrypto = g.currency === "USDT" || g.currency === "USD";
            const targetFormatted = isCrypto
              ? `${target.toNumber().toLocaleString()} ${g.currency}`
              : `Bs ${target.toNumber().toLocaleString()}`;
            const currentFormatted = isCrypto
              ? `${current.toNumber().toLocaleString()} ${g.currency}`
              : `Bs ${current.toNumber().toLocaleString()}`;
            const remainingFormatted = isCrypto
              ? `${remaining.toNumber().toLocaleString()} ${g.currency}`
              : `Bs ${remaining.toNumber().toLocaleString()}`;

            return (
              <div
                key={g.id}
                className="p-4 rounded-[16px] bg-white border border-[#E2E8F0] shadow-2xs flex flex-col gap-3 hover:border-slate-300 transition"
              >
                {/* Top Row: Icon + Name + Percentage + Target */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[20px] shrink-0">{getEmoji(g.name)}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] font-[800] text-[#0F172A] truncate">
                        {g.name}
                      </span>
                      <span className="text-[10px] text-[#64748B] font-medium">
                        Meta: {targetFormatted} {g.targetDate ? `• Fecha: ${g.targetDate}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[15px] font-[900] font-mono ${percentColor}`}>
                      {percentage}%
                    </span>
                    {onOpenContributeModal && (
                      <button
                        onClick={() => onOpenContributeModal(g)}
                        className="h-[30px] px-2.5 rounded-[8px] bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-[11px] font-[700] transition"
                      >
                        Aportar
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-[8px] rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full ${progressColor} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Footnote: Current vs Remaining */}
                <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B]">
                  <span>Ahorrado: <b className="text-[#0F172A]">{currentFormatted}</b></span>
                  <span>Faltan: <b className="text-[#0F172A]">{remainingFormatted}</b></span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
