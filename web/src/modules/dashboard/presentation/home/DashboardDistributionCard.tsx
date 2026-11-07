"use client";

import React from "react";
import { Info, Home, Heart, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import type { RecommendedDistribution } from "../../domain/dashboard-home-analytics";

interface DashboardDistributionCardProps {
  distribution: RecommendedDistribution;
  selectedCurrency: string;
}

export function DashboardDistributionCard({
  distribution,
  selectedCurrency,
}: DashboardDistributionCardProps) {
  const format = useNumberFormat();
  const currencySymbol = selectedCurrency === "USD" ? "$" : "Bs";

  return (
    <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden h-full">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-1.5">
          <span>Distribución recomendada (50/30/20)</span>
          <Info className="w-3.5 h-3.5 text-muted-foreground" />
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex flex-col gap-4">
        {/* Segmented Tri-Color Horizontal Progress Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-muted/40 shadow-inner">
          <div className="h-full bg-emerald-400 w-1/2 transition-all" title="50% Necesidades" />
          <div className="h-full bg-amber-400 w-[30%] transition-all" title="30% Estilo de vida" />
          <div className="h-full bg-purple-500 w-[20%] transition-all" title="20% Ahorro e inversión" />
        </div>

        {/* 3 Breakdown Items */}
        <div className="flex flex-col gap-2.5">
          {/* 50% Necesidades */}
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <Home className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-bold text-foreground truncate">
                50% <span className="font-semibold text-muted-foreground">Necesidades</span>
              </span>
            </div>
            <span className="font-extrabold text-foreground tabular-nums text-xs sm:text-sm shrink-0">
              {currencySymbol} {format(distribution.necesidades)}
            </span>
          </div>

          {/* 30% Estilo de vida */}
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <Heart className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-bold text-foreground truncate">
                30% <span className="font-semibold text-muted-foreground">Estilo de vida</span>
              </span>
            </div>
            <span className="font-extrabold text-foreground tabular-nums text-xs sm:text-sm shrink-0">
              {currencySymbol} {format(distribution.estiloDeVida)}
            </span>
          </div>

          {/* 20% Ahorro e inversión */}
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
              <TrendingUp className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="font-bold text-foreground truncate">
                20% <span className="font-semibold text-muted-foreground">Ahorro e inversión</span>
              </span>
            </div>
            <span className="font-extrabold text-foreground tabular-nums text-xs sm:text-sm shrink-0">
              {currencySymbol} {format(distribution.ahorroEInversion)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
