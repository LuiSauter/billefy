"use client";

import React from "react";
import Decimal from "decimal.js";
import { ArrowDown, Layers, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import type { FinancialReport } from "../domain/reports-analytics";
import { Amount, Percentage } from "@/shared/ui/amount";

interface ReportsKpiCardsProps {
  /** Already aggregated and converted to selectedCurrency by the domain engine. */
  kpis: FinancialReport["kpis"];
  selectedCurrency: string;
}

export function ReportsKpiCards({ kpis, selectedCurrency }: ReportsKpiCardsProps) {
  const cards = [
    { label: "Ingresos totales", value: kpis.totalIncome, growth: kpis.incomeGrowthPct, icon: TrendingUp, tone: "bg-emerald-500/15 text-emerald-400", expense: false },
    { label: "Gastos totales", value: kpis.totalExpenses, growth: kpis.expensesGrowthPct, icon: ArrowDown, tone: "bg-rose-500/15 text-rose-400", expense: true },
    { label: "Ahorro / Inversión", value: kpis.savingsAndInvestments, growth: kpis.savingsGrowthPct, icon: Layers, tone: "bg-purple-500/15 text-purple-400", expense: false },
    { label: "Balance neto", value: kpis.netBalance, growth: kpis.netBalanceGrowthPct, icon: Wallet, tone: "bg-teal-500/15 text-teal-400", expense: false },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, growth, icon: Icon, tone, expense }) => {
        const change = new Decimal(growth).toDecimalPlaces(1, Decimal.ROUND_HALF_UP);
        const favorable = expense ? growth < 0 : growth > 0;
        return (
          <Card key={label} className="min-w-0 border-border/80">
            <CardContent className="flex items-start gap-3 p-4">
              <div aria-hidden="true" className={`flex size-14 shrink-0 items-center justify-center rounded-full ${tone}`}>
                <Icon className="size-7" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-medium">{label}</h2>
                <p className="my-1 break-words text-xl font-bold tracking-tight tabular-nums">
                  <Amount value={value} currency={selectedCurrency} size="inherit" tone="inherit" />
                </p>
                <Badge variant={change.isZero() ? "secondary" : favorable ? "success" : "expense"} title="Variación respecto al período anterior">
                  <Percentage value={change} sign="always" size="inherit" tone="inherit" />
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
