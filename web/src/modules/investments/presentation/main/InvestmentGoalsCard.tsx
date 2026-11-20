"use client";

import React from "react";
import { Target, Plus } from "lucide-react";
import { Amount } from "@/shared/ui/amount";
import { Button } from "@/shared/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { InvestmentsCard } from "../InvestmentsCard";

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
  currency = "USD",
}: InvestmentGoalsCardProps) {
  return (
    <InvestmentsCard>
      <CardHeader className={`${appCardHeaderClassName} flex flex-row items-center justify-between space-y-0`}>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" aria-hidden="true" />
          <CardTitle className={appCardTitleClassName}>Metas de inversión</CardTitle>
        </div>
        {onAddGoal && (
          <Button type="button" variant="outline" size="xs" onClick={onAddGoal}>
            <Plus aria-hidden="true" />
            <span>Agregar</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className={appCardContentClassName}>
        {goals.length > 0 ? (
          <div className="flex flex-col gap-4">
            {goals.map((goal) => (
              <div key={goal.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground">{goal.title}</span>
                  <span className="text-foreground font-bold">
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

                <div className="text-[11px] text-muted-foreground flex justify-between">
                  <span>
                    <Amount value={goal.currentAmount} currency={currency} size="inherit" tone="inherit" /> / <Amount value={goal.targetAmount} currency={currency} size="inherit" tone="inherit" />
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
              <Button
                type="button"
                size="xs"
                className="mt-1 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                onClick={onAddGoal}
              >
                + Crear meta
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </InvestmentsCard>
  );
}
