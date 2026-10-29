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
  p2pRate,
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
            {health ? `${(health.savingsRate * 100).toFixed(1)}%` : "24.0%"}
          </span>
          <span className="text-[10px] font-[500] text-[#34D399]">Meta: &gt;20% (Óptimo)</span>
        </div>

        {/* Col 1: Fondo Emergencia */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Fondo Emergencia</span>
          <span className="text-[20px] font-[900] text-white font-mono">
            {health?.emergencyFundMonths ? `${health.emergencyFundMonths.toFixed(1)} meses` : "4.2 meses"}
          </span>
          <span className="text-[10px] font-[500] text-[#60A5FA]">Bs. 21,500 de 30,000</span>
        </div>

        {/* Col 2: Carga de Deuda */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Carga de Deuda</span>
          <span className="text-[20px] font-[900] text-white font-mono">
            {health && health.monthlyIncome > 0
              ? `${((health.totalDebtLiabilities / health.monthlyIncome) * 100).toFixed(1)}%`
              : "12.0%"}
          </span>
          <span className="text-[10px] font-[500] text-[#34D399]">Límite prudente: 30%</span>
        </div>

        {/* Col 3: Total Ahorrado */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Total Ahorrado</span>
          <span className="text-[20px] font-[900] text-white font-mono">
            Bs. {totalSavedBob}
          </span>
          <span className="text-[10px] font-[500] text-[#FCD34D]">
            {goals.length > 0 ? goals.length : 4} Metas activas
          </span>
        </div>
      </div>

      {/* Goal Cards List (OpenPencil GWItem_0, 1, 2, 3) */}
      <div className="flex flex-col gap-3">
        {goals.length === 0 ? (
          <div className="p-6 rounded-[14px] bg-white border border-[#E2E8F0] text-center text-[#64748B] text-xs">
            No tenés metas creadas aún. Creá tu primera meta con &quot;+ Nuevo Objetivo&quot;.
          </div>
        ) : (
          goals.map((g, idx) => {
            const current = new Decimal(g.currentAmount);
            const target = new Decimal(g.targetAmount);
            const percentage = target.gt(0) ? Math.min(100, Math.round(current.div(target).times(100).toNumber())) : 0;
            const remaining = Decimal.max(0, target.minus(current));
            const progressColor = getProgressColor(idx);
            const percentageColor = getPercentageColor(idx);
            const emoji = getEmoji(g.name);

            const isCrypto = g.currency === "USDT" || g.currency === "USD";
            const currentFormatted = isCrypto
              ? `${current.toLocaleString()} / ${target.toLocaleString()} USDT (≈ Bs. ${current.times(p2pRate).toFixed(0)})`
              : `Bs. ${current.toLocaleString()} / Bs. ${target.toLocaleString()}`;

            return (
              <div
                key={g.id}
                className="p-3.5 rounded-[14px] border border-[#E2E8F0] bg-white flex flex-col gap-2 hover:border-slate-300 transition shadow-xs"
              >
                {/* Top Row (OpenPencil GITop) */}
                <div className="flex items-center justify-between gap-3">
                  {/* Left (GIL) */}
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[14px] font-[800] text-[#0F172A] truncate">
                      {emoji} {g.name.replace(/^[^\w\s]+/, "").trim()}
                    </span>
                    <span className="text-[11px] font-[500] text-[#64748B] truncate hidden sm:inline">
                      • {g.currency === "USDT" ? "Binance Wallet • Billetera Spot USDT" : "Banco Unión • Cuenta Ahorro en Bs."}
                    </span>
                  </div>

                  {/* Right (GIR) */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[13px] font-[800] text-[#0F172A] font-mono">
                      {currentFormatted}
                    </span>
                    <span className={`text-[12px] font-[900] font-mono ${percentageColor}`}>
                      {percentage}%
                    </span>
                    <button
                      onClick={() => onOpenContributeModal && onOpenContributeModal(g)}
                      className="text-[11px] font-[800] text-[#2563EB] hover:underline"
                    >
                      + Aportar
                    </button>
                  </div>
                </div>

                {/* Progress Bar Track (OpenPencil GITrk) */}
                <div className="w-full h-[8px] rounded-full bg-[#E2E8F0] overflow-hidden">
                  <div
                    className={`h-full ${progressColor} transition-all duration-300 rounded-full`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Bottom Details Info */}
                <div className="text-[11px] font-[500] text-[#64748B]">
                  Faltan {isCrypto ? `${remaining.toFixed(0)} USDT` : `Bs. ${remaining.toFixed(2)}`} • Plazo: {g.targetDate || "Diciembre 2025"}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
