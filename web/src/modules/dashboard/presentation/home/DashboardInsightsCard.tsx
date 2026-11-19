"use client";

import React from "react";
import { Lightbulb, CheckCircle2, ArrowRight } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  DashboardCard,
  dashboardCardContentClassName,
  dashboardCardHeaderClassName,
  dashboardCardTitleClassName,
} from "./dashboard-card";
import { Button } from "@/shared/ui/button";
import type { DashboardInsight } from "../../domain/dashboard-home-analytics";

interface DashboardInsightsCardProps {
  insights: DashboardInsight[];
  onOpenPlan?: () => void;
}

export function DashboardInsightsCard({
  insights,
  onOpenPlan,
}: DashboardInsightsCardProps) {
  return (
    <DashboardCard className="overflow-hidden h-full flex flex-col justify-between">
      <CardHeader className={dashboardCardHeaderClassName}>
        <CardTitle className={`${dashboardCardTitleClassName} flex items-center gap-2`}>
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Insights y recomendaciones</span>
        </CardTitle>
      </CardHeader>

      <CardContent className={`${dashboardCardContentClassName} flex flex-col justify-between gap-4 flex-1`}>
        <div className="flex flex-col gap-3">
          {insights.map((insight) => (
            <div key={`${insight.type}:${insight.text}`} className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                {insight.text}
              </p>
            </div>
          ))}
        </div>

        {/* Action Button: Ver plan de acción */}
        <Button
          type="button"
          onClick={onOpenPlan}
          className="w-full bg-muted/60 hover:bg-muted border border-border/60 text-foreground text-xs font-semibold h-9 rounded-xl flex items-center justify-center gap-2 transition-colors mt-auto"
        >
          <span>Ver plan de acción</span>
          <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
        </Button>
      </CardContent>
    </DashboardCard>
  );
}
