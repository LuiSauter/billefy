"use client";

import React from "react";
import {
  TrendingUp,
  ArrowDownLeft,
  Repeat,
  HandCoins,
  Target,
  ArrowUp,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import type { CalendarKpis } from "../../domain/calendar-analytics";

interface CalendarioKpiCardsProps {
  kpis: CalendarKpis;
  selectedCurrency: string;
}

export function CalendarioKpiCards({
  kpis,
  selectedCurrency,
}: CalendarioKpiCardsProps) {
  const format = useNumberFormat();
  const currencySymbol = selectedCurrency === "USD" ? "$" : "Bs";

  const cards = [
    {
      title: "Ingresos previstos",
      amount: kpis.ingresosPrevistos.amount,
      eventsCount: kpis.ingresosPrevistos.count,
      trend: kpis.ingresosPrevistos.trendPercentage,
      icon: TrendingUp,
      iconBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      trendColor: "text-emerald-400",
      isProgress: false,
    },
    {
      title: "Gastos previstos",
      amount: kpis.gastosPrevistos.amount,
      eventsCount: kpis.gastosPrevistos.count,
      trend: kpis.gastosPrevistos.trendPercentage,
      icon: ArrowDownLeft,
      iconBg: "bg-rose-500/15 border-rose-500/30 text-rose-400",
      trendColor: "text-emerald-400",
      isProgress: false,
    },
    {
      title: "Pagos recurrentes",
      amount: kpis.pagosRecurrentes.amount,
      eventsCount: kpis.pagosRecurrentes.count,
      trend: kpis.pagosRecurrentes.trendPercentage,
      icon: Repeat,
      iconBg: "bg-purple-500/15 border-purple-500/30 text-purple-400",
      trendColor: "text-emerald-400",
      isProgress: false,
    },
    {
      title: "Cobros previstos",
      amount: kpis.cobrosPrevistos.amount,
      eventsCount: kpis.cobrosPrevistos.count,
      trend: kpis.cobrosPrevistos.trendPercentage,
      icon: HandCoins,
      iconBg: "bg-blue-500/15 border-blue-500/30 text-blue-400",
      trendColor: "text-emerald-400",
      isProgress: false,
    },
    {
      title: "Ahorro del mes",
      amount: kpis.ahorroMes.amount,
      eventsCount: 0,
      trend: kpis.ahorroMes.percentage,
      icon: Target,
      iconBg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400",
      trendColor: "text-purple-400",
      isProgress: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className="border-border/70 bg-card/60 backdrop-blur-xs shadow-xs rounded-2xl overflow-hidden hover:border-border transition-colors"
          >
            <CardContent className="p-4 flex flex-col justify-between gap-3 min-h-[120px]">
              {/* Header row with Icon and Label */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${card.iconBg}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-muted-foreground truncate">
                    {card.title}
                  </span>
                  <span className="text-base sm:text-[17px] font-extrabold text-foreground tracking-tight tabular-nums truncate">
                    {currencySymbol} {format(card.amount)}
                  </span>
                </div>
              </div>

              {/* Footer info: Subtitle & Trend or Progress Bar */}
              {card.isProgress ? (
                <div className="flex flex-col gap-1.5 mt-auto">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {card.trend.toFixed(1)}% de tus ingresos
                  </span>
                  <Progress
                    value={Math.min(Math.max(card.trend, 0), 100)}
                    className="h-1.5 bg-muted/60 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-indigo-500"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1 text-[11px] mt-auto">
                  <span className="text-muted-foreground font-medium">
                    {card.eventsCount} {card.eventsCount === 1 ? "evento" : "eventos"}
                  </span>
                  <div className={`flex items-center gap-0.5 font-bold ${card.trendColor}`}>
                    <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                    <span>+{card.trend.toFixed(1)}% vs. mes anterior</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
