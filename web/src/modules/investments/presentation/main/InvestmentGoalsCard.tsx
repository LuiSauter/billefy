"use client";

import React from "react";
import { Target, Plus } from "lucide-react";

export interface InvestmentGoalDisplayItem {
  id: string;
  title: string;
  currentAmount: number;
  targetAmount: number;
  percentage: number;
  color?: string;
}

interface InvestmentGoalsCardProps {
  goals?: InvestmentGoalDisplayItem[];
  onAddGoal?: () => void;
  currency?: string;
}

export function InvestmentGoalsCard({
  goals = [],
  onAddGoal,
  currency = "$",
}: InvestmentGoalsCardProps) {
  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Metas de inversión
          </h3>
        </div>
        {onAddGoal && (
          <button
            type="button"
            onClick={onAddGoal}
            className="h-7 px-2.5 rounded-lg border border-border/80 bg-muted/60 hover:bg-muted text-foreground text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Agregar</span>
          </button>
        )}
      </div>

      {goals.length > 0 ? (
        <div className="flex flex-col gap-4">
          {goals.map((goal) => (
            <div key={goal.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">{goal.title}</span>
                <span className="text-foreground font-mono font-bold">
                  {goal.percentage}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, goal.percentage))}%`,
                    backgroundColor: goal.color || "#a855f7",
                  }}
                />
              </div>

              <div className="text-[11px] font-mono text-muted-foreground flex justify-between">
                <span>
                  {currency} {goal.currentAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} / {currency} {goal.targetAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-5 text-center rounded-xl bg-muted/30 border border-border/50 gap-2.5">
          <Target className="w-6 h-6 text-muted-foreground/60" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground">
              Sin metas de inversión
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px]">
              Definí una meta de ahorro o inversión para dar seguimiento a tu progreso.
            </span>
          </div>
          {onAddGoal && (
            <button
              type="button"
              onClick={onAddGoal}
              className="mt-1 h-7 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition cursor-pointer"
            >
              + Crear meta
            </button>
          )}
        </div>
      )}
    </div>
  );
}
