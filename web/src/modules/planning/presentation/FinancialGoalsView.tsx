"use client";

import Decimal from "decimal.js";
import { Plus } from "lucide-react";
import {
  FinancialHealthDto,
  GoalDto,
  getGoalEmoji,
} from "@/modules/planning/domain/planning.types";

interface FinancialGoalsViewProps {
  goals: GoalDto[];
  health: FinancialHealthDto | null;
  totalSavedBob: string;
  onOpenCreateGoalModal: () => void;
  onOpenContributeModal?: (goal: GoalDto) => void;
  p2pRate: number;
}

const PROGRESS_COLORS = ["bg-primary", "bg-emerald-500", "bg-blue-500", "bg-violet-500"];
const TEXT_COLORS = ["text-primary", "text-emerald-400", "text-blue-400", "text-violet-400"];

export function FinancialGoalsView({
  goals,
  health,
  totalSavedBob,
  onOpenCreateGoalModal,
  onOpenContributeModal,
}: FinancialGoalsViewProps) {
  return (
    <div className="w-full max-w-[880px] p-[24px_24px_32px_24px] rounded-[24px] bg-card border border-border shadow-xs flex flex-col gap-[18px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-black text-foreground tracking-tight">
            Objetivos Financieros & Metas de Ahorro
          </h1>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            Seguimiento patrimonial en bolivianos (BOB) y criptoactivos (USDT)
          </p>
        </div>

        <button
          onClick={onOpenCreateGoalModal}
          className="h-[38px] px-4 rounded-[10px] bg-primary hover:bg-blue-600 active:scale-[0.99] text-white text-sm font-extrabold transition flex items-center gap-1.5 shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Objetivo</span>
        </button>
      </div>

      <div className="p-4 rounded-[16px] bg-background border border-border text-foreground shadow-md grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-muted-foreground">Tasa de Ahorro</span>
          <span className="text-[20px] font-black text-foreground font-mono">
            {health ? `${(health.savingsRate * 100).toFixed(1)}%` : "0.0%"}
          </span>
          <span className="text-xs font-medium text-emerald-400">Meta: &gt;20%</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-muted-foreground">Fondo Emergencia</span>
          <span className="text-[20px] font-black text-foreground font-mono">
            {health?.emergencyFundMonths ? `${health.emergencyFundMonths.toFixed(1)} meses` : "0.0 meses"}
          </span>
          <span className="text-xs font-medium text-blue-400">Objetivo 3 a 6 meses</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-muted-foreground">Carga de Deuda</span>
          <span className="text-[20px] font-black text-foreground font-mono">
            {health && health.monthlyIncome > 0
              ? `${((health.totalDebtLiabilities / health.monthlyIncome) * 100).toFixed(1)}%`
              : "0.0%"}
          </span>
          <span className="text-xs font-medium text-emerald-400">Límite prudente: 30%</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-muted-foreground">Total Asignado a Metas</span>
          <span className="text-[20px] font-black text-foreground font-mono">
            Bs. {totalSavedBob}
          </span>
          <span className="text-xs font-medium text-amber-400">
            {goals.length} {goals.length === 1 ? "Meta activa" : "Metas activas"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {goals.length === 0 ? (
          <div className="p-8 rounded-[16px] bg-background border border-border text-center text-muted-foreground text-xs space-y-2">
            <p className="font-semibold text-foreground">No tenés metas de ahorro creadas todavía.</p>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Definí objetivos como tu fondo de emergencia, vehículo o vacaciones para proyectar tu ahorro mes a mes.
            </p>
            <button
              onClick={onOpenCreateGoalModal}
              className="mt-2 text-primary font-bold text-xs hover:underline"
            >
              + Crear mi primera meta
            </button>
          </div>
        ) : (
          goals.map((g, idx) => {
            const current = new Decimal(g.currentAmount);
            const target = new Decimal(g.targetAmount);
            const percentage = target.gt(0)
              ? Math.min(100, Math.round(current.div(target).times(100).toNumber()))
              : 0;
            const remaining = Decimal.max(0, target.minus(current));
            const progressColor = PROGRESS_COLORS[idx % PROGRESS_COLORS.length];
            const percentColor = TEXT_COLORS[idx % TEXT_COLORS.length];

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
                className="p-4 rounded-[16px] bg-background border border-border shadow-2xs flex flex-col gap-3 hover:border-primary/40 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[20px] shrink-0">{getGoalEmoji(g.name)}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[15px] font-extrabold text-foreground truncate">
                        {g.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        Meta: {targetFormatted} {g.targetDate ? `• Fecha: ${g.targetDate}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[15px] font-black font-mono ${percentColor}`}>
                      {percentage}%
                    </span>
                    {onOpenContributeModal && (
                      <button
                        onClick={() => onOpenContributeModal(g)}
                        className="h-[30px] px-2.5 rounded-[8px] bg-secondary border border-border hover:bg-muted text-foreground text-xs font-bold transition"
                      >
                        Aportar
                      </button>
                    )}
                  </div>
                </div>

                <div className="w-full h-[8px] rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${progressColor} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>
                    Ahorrado: <b className="text-foreground">{currentFormatted}</b>
                  </span>
                  <span>
                    Faltan: <b className="text-foreground">{remainingFormatted}</b>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
