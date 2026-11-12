"use client";

import React from "react";
import {
  Calendar,
  Pencil,
  Trash2,
  CheckCircle2,
  MoreVertical,
  Plane,
  Laptop,
  Home,
  Car,
  Shield,
  GraduationCap,
  Target,
} from "lucide-react";
import { GoalDto } from "../domain/planning.types";
import { Amount } from "@/shared/ui/amount";
import { formatPercent } from "@/shared/lib/amount-format";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";

interface GoalCardProps {
  goal: GoalDto;
  onEdit?: (goal: GoalDto) => void;
  onDelete?: (id: string) => void;
}

export function getGoalIconAndTheme(name: string) {
  const n = name.toLowerCase();
  if (n.includes("viaje") || n.includes("vacaciones") || n.includes("vuelo")) {
    return {
      icon: <Plane className="w-6 h-6 text-sky-400" />,
      bg: "bg-sky-500/10 border-sky-500/25",
      ringColor: "#38BDF8",
    };
  }
  if (n.includes("laptop") || n.includes("pc") || n.includes("computadora") || n.includes("tech")) {
    return {
      icon: <Laptop className="w-6 h-6 text-indigo-400" />,
      bg: "bg-indigo-500/10 border-indigo-500/25",
      ringColor: "#818CF8",
    };
  }
  if (n.includes("casa") || n.includes("vivienda") || n.includes("hogar") || n.includes("inmueble")) {
    return {
      icon: <Home className="w-6 h-6 text-amber-400" />,
      bg: "bg-amber-500/10 border-amber-500/25",
      ringColor: "#FBBF24",
    };
  }
  if (n.includes("auto") || n.includes("car") || n.includes("vehiculo") || n.includes("moto")) {
    return {
      icon: <Car className="w-6 h-6 text-amber-500" />,
      bg: "bg-amber-500/10 border-amber-500/25",
      ringColor: "#F59E0B",
    };
  }
  if (n.includes("fondo") || n.includes("emergencia") || n.includes("seguridad") || n.includes("colchon")) {
    return {
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      bg: "bg-emerald-500/10 border-emerald-500/25",
      ringColor: "#10B981",
    };
  }
  if (n.includes("maestr") || n.includes("estudio") || n.includes("universidad") || n.includes("educacion")) {
    return {
      icon: <GraduationCap className="w-6 h-6 text-purple-400" />,
      bg: "bg-purple-500/10 border-purple-500/25",
      ringColor: "#A855F7",
    };
  }
  return {
    icon: <Target className="w-6 h-6 text-primary" />,
    bg: "bg-primary/10 border-primary/25",
    ringColor: "#10B981",
  };
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const preferences = useNumberPreferences();
  const target = Number(goal.targetAmount) || 0;
  const current = Number(goal.currentAmount) || 0;
  const percentage = Math.min(100, Math.max(0, Math.round(goal.percentageAchieved ?? 0)));
  const isCompleted = percentage >= 100;
  const isPaused =
    goal.trackingStatus === "unlinked" || goal.trackingStatus === "unavailable";

  const { icon, bg, ringColor } = getGoalIconAndTheme(goal.name);

  // Status Badge
  let statusBadge = (
    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
      En progreso
    </span>
  );
  if (isCompleted) {
    statusBadge = (
      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-bold">
        Completada
      </span>
    );
  } else if (isPaused) {
    statusBadge = (
      <span className="px-2.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground text-[11px] font-bold">
        Pausada
      </span>
    );
  }

  return (
    <div className="bg-card border border-border rounded-[20px] p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-muted-foreground/50 transition-all">
      {/* 1. Header with Icon Badge, Title, Subtitle, Badge & 3-dots */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-14 h-14 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${bg}`}
          >
            {icon}
          </div>

          <div className="flex flex-col min-w-0">
            <h3 className="text-[15px] font-black text-foreground truncate tracking-tight">
              {goal.name}
            </h3>
            <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
              {goal.accountName ? `Cuenta: ${goal.accountName}` : "Sin cuenta vinculada"}
            </p>
          </div>
        </div>

        {/* Status Badge + More button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {statusBadge}
          <button
            type="button"
            className="p-1 text-muted-foreground hover:text-foreground transition"
            title="Opciones"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Progress Dual Indicator (Radial Ring + Numbers + Horizontal Bar) */}
      <div className="flex items-center gap-3 pt-1">
        {/* Radial Ring */}
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90 text-muted-foreground" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
            />
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke={isCompleted ? "#A855F7" : ringColor}
              strokeWidth="3.5"
              strokeDasharray={88}
              strokeDashoffset={88 - (88 * percentage) / 100}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[11px] font-black text-foreground">
            {formatPercent(percentage, preferences)}
          </span>
        </div>

        {/* Numbers + Bar */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center justify-end gap-1 text-xs min-w-0">
            <Amount value={current} currency={goal.currency} size="xs" />
            <span className="text-muted-foreground">/</span>
            <Amount value={target} currency={goal.currency} size="xs" />
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isCompleted ? "bg-purple-500" : isPaused ? "bg-muted-foreground" : "bg-primary"}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Target Date & Remaining Time */}
      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
        <div className="flex items-center gap-1.5 truncate">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span>{goal.targetDate || "Sin fecha fija"}</span>
        </div>

        <span className="font-semibold text-muted-foreground shrink-0">
          {isCompleted ? (
            <span className="text-sky-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completada</span>
            </span>
          ) : goal.monthsRemaining !== null && goal.monthsRemaining !== undefined ? (
            `${goal.monthsRemaining} ${goal.monthsRemaining === 1 ? "mes restante" : "meses restantes"}`
          ) : (
            "En seguimiento"
          )}
        </span>
      </div>

      {/* 4. Tag Pills (Real currency & tracking mode) */}
      <div className="flex flex-wrap gap-1.5">
        <span className="px-3 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium border border-border">
          {goal.currency}
        </span>
        <span className="px-3 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium border border-border">
          {goal.trackingStatus === "tracked" ? "Vinculada" : "Sin vincular"}
        </span>
        {goal.monthlyContributionNeeded ? (
          <span className="px-3 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium border border-border">
            <Amount value={goal.monthlyContributionNeeded} currency={goal.currency} size="xs" />/mes
          </span>
        ) : null}
      </div>

      {/* 5. Footer: "Ver detalles →" and Actions (Pencil, Trash) */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <button
          type="button"
          onClick={() => onEdit?.(goal)}
          className="text-xs font-bold text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
        >
          <span>Ver detalles</span>
          <span>→</span>
        </button>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(goal)}
              className="p-1 text-muted-foreground hover:text-foreground transition"
              title="Editar meta"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(goal.id)}
              className="p-1 text-muted-foreground hover:text-destructive transition"
              title="Eliminar meta"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
