"use client";

import React from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { PatrimonioInsight } from "../domain/patrimonio.types";

interface PatrimonioInsightsCardProps {
  insights: PatrimonioInsight[];
}

export function PatrimonioInsightsCard({ insights }: PatrimonioInsightsCardProps) {
  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <h3 className="text-base font-bold text-foreground tracking-tight">
          Insights
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        {insights.map((ins) => (
          <div key={ins.id} className="flex items-start gap-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-muted-foreground font-medium leading-relaxed">
              {ins.text}
            </span>
          </div>
        ))}

        {insights.length === 0 && (
          <span className="text-xs text-muted-foreground italic">
            Agregá tus activos y pasivos para generar recomendaciones patrimoniales.
          </span>
        )}
      </div>
    </div>
  );
}
