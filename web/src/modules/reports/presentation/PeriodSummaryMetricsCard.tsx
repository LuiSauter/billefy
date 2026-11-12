"use client";

import React from "react";
import Decimal from "decimal.js";
import { PiggyBank, Scale, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import type { FinancialReport } from "../domain/reports-analytics";
import { Percentage } from "@/shared/ui/amount";

interface PeriodSummaryMetricsCardProps {
  summary?: FinancialReport["periodSummary"];
}

export function PeriodSummaryMetricsCard({ summary }: PeriodSummaryMetricsCardProps) {
  const metrics = [
    { label: "Ratio de ahorro", value: summary?.savingsRatio, icon: PiggyBank, tone: "bg-emerald-500/15 text-emerald-400", target: "(Recomendado: >= 20%)", signed: false, favorable: (value: number) => value >= 20, neutral: false },
    { label: "Crecimiento del patrimonio", value: summary?.netWorthGrowthPct, icon: TrendingUp, tone: "bg-purple-500/15 text-purple-400", target: "vs. período anterior", signed: true, favorable: (value: number) => value > 0, neutral: false },
    { label: "Ratio de endeudamiento", value: summary?.debtRatio, icon: Scale, tone: "bg-sky-500/15 text-sky-400", target: "(Saludable: < 30%)", signed: false, favorable: (value: number) => value < 30, neutral: true },
    { label: "Cumplimiento del presupuesto", value: summary?.budgetCompliance, icon: Target, tone: "bg-amber-500/15 text-amber-400", target: "del gasto planificado", signed: false, favorable: (value: number) => value <= 100, neutral: false },
  ];

  return (
    <Card className="@container h-full min-w-0 border-border/80">
      <CardHeader><h2 className="text-lg font-bold tracking-tight">Resumen del período</h2></CardHeader>
      <CardContent>
        <dl className="divide-y divide-border border-y border-border">
          {metrics.map(({ label, value, icon: Icon, tone, target, signed, favorable, neutral }) => {
            const change = value !== undefined && Number.isFinite(value)
              ? new Decimal(value).toDecimalPlaces(1, Decimal.ROUND_HALF_UP) : undefined;
            const variant = !change ? "outline" : change.isZero() ? "secondary"
              : favorable(value!) ? neutral ? "secondary" : "success" : "expense";
            return (
              <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 @min-[440px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.8fr)]">
                <dt className="flex min-w-0 items-center gap-3 text-sm font-medium">
                  <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" /></span>
                  <span>{label}</span>
                </dt>
                <dd>
                  <Badge variant={variant} className="tabular-nums">
                    {change ? <Percentage value={change} sign={signed ? "always" : "auto"} size="inherit" tone="inherit" /> : "—"}
                  </Badge>
                </dd>
                <dd className="col-span-2 pl-11 text-xs text-muted-foreground @min-[440px]:col-span-1 @min-[440px]:pl-0">{target}</dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
