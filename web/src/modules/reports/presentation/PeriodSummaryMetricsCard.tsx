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

// Static definitions live at module scope: they never depend on props.
const METRICS: readonly {
  key: keyof FinancialReport["periodSummary"]; label: string; icon: typeof PiggyBank;
  tone: "success" | "purple" | "investment" | "secondary"; target: string; signed: boolean;
  favorable: (value: number) => boolean; neutral: boolean;
}[] = [
  { key: "savingsRatio", label: "Ratio de ahorro", icon: PiggyBank, tone: "success", target: "(Recomendado: >= 20%)", signed: false, favorable: (value) => value >= 20, neutral: false },
  { key: "netWorthGrowthPct", label: "Crecimiento del patrimonio", icon: TrendingUp, tone: "purple", target: "vs. período anterior", signed: true, favorable: (value) => value > 0, neutral: false },
  { key: "debtRatio", label: "Ratio de endeudamiento", icon: Scale, tone: "investment", target: "(Saludable: < 30%)", signed: false, favorable: (value) => value < 30, neutral: true },
  { key: "budgetCompliance", label: "Cumplimiento del presupuesto", icon: Target, tone: "secondary", target: "del gasto planificado", signed: false, favorable: (value) => value <= 100, neutral: false },
];

export function PeriodSummaryMetricsCard({ summary }: PeriodSummaryMetricsCardProps) {
  return (
    <Card className="@container h-full min-w-0 border-border/80">
      <CardHeader><h2 className="text-lg font-bold tracking-tight">Resumen del período</h2></CardHeader>
      <CardContent>
        <dl className="divide-y divide-border border-y border-border">
          {METRICS.map(({ key, label, icon: Icon, tone, target, signed, favorable, neutral }) => {
            const value = summary?.[key];
            // undefined/null = unavailable (no denominator): show "—", never a fabricated 0%.
            const change = value !== undefined && value !== null && Number.isFinite(value)
              ? new Decimal(value).toDecimalPlaces(1, Decimal.ROUND_HALF_UP) : undefined;
            const variant = !change ? "outline" : change.isZero() ? "secondary"
              : favorable(value!) ? neutral ? "secondary" : "success" : "expense";
            return (
              <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 @min-[440px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.8fr)]">
                <dt className="flex min-w-0 items-center gap-3 text-sm font-medium">
                  <Badge variant={tone} aria-hidden="true" className="size-8 shrink-0 rounded-xl p-0 [&>svg]:size-5"><Icon /></Badge>
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
