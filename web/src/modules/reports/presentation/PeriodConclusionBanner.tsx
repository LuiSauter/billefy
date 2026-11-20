"use client";

import React from "react";
import { ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import type { FinancialReport } from "../domain/reports-analytics";
import { REPORT_CTA_CLASS } from "./reports-shared";

interface PeriodConclusionBannerProps {
  conclusion?: FinancialReport["conclusion"];
  onViewRecommendations?: () => void;
}

export function PeriodConclusionBanner({ conclusion, onViewRecommendations }: PeriodConclusionBannerProps) {
  const narrative = conclusion?.narrative.trim()
    ? conclusion.narrative : "No hay datos suficientes para generar una conclusión del período.";

  return (
    <Card className="w-full min-w-0 border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-card">
      <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400"><Lightbulb className="size-8" /></span>
          <div className="min-w-0">
            <h2 className="mb-1 text-lg font-bold tracking-tight">Conclusión del período</h2>
            <p className="break-words text-sm leading-relaxed">{narrative}</p>
          </div>
        </div>
        <Button type="button" disabled={!onViewRecommendations} onClick={onViewRecommendations} className={cn(REPORT_CTA_CLASS, "w-full shrink-0 sm:w-auto sm:self-start lg:self-center")}>
          Ver recomendaciones <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
