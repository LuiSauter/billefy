"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Info, Sparkles } from "lucide-react";
import { PatrimonioInsight } from "../domain/patrimonio.types";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { PatrimonioCard } from "./PatrimonioCard";

interface PatrimonioInsightsCardProps {
  insights: PatrimonioInsight[];
}

const INSIGHT_STYLES: Record<PatrimonioInsight["type"], { icon: React.ElementType; className: string }> = {
  positive: { icon: CheckCircle2, className: "text-emerald-400" },
  info: { icon: Info, className: "text-purple-400" },
  warning: { icon: AlertTriangle, className: "text-amber-400" },
};

export function PatrimonioInsightsCard({ insights }: PatrimonioInsightsCardProps) {
  return (
    <PatrimonioCard>
      <CardHeader className={appCardHeaderClassName}>
        <CardTitle className={`${appCardTitleClassName} flex items-center gap-2`}>
          <Sparkles className="w-4 h-4 text-purple-400" aria-hidden="true" />
          Insights
        </CardTitle>
      </CardHeader>

      <CardContent className={`${appCardContentClassName} flex flex-col gap-3`}>
        {insights.map((ins) => {
          const { icon: Icon, className } = INSIGHT_STYLES[ins.type] ?? INSIGHT_STYLES.info;
          return (
            <div key={ins.id} data-insight-type={ins.type} className="flex items-start gap-2.5 text-xs">
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${className}`} aria-hidden="true" />
              <span className="text-muted-foreground font-medium leading-relaxed">{ins.text}</span>
            </div>
          );
        })}

        {insights.length === 0 && (
          <span className="text-xs text-muted-foreground italic">
            Agregá tus activos y pasivos para generar recomendaciones patrimoniales.
          </span>
        )}
      </CardContent>
    </PatrimonioCard>
  );
}
