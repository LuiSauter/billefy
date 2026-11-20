"use client";

import React, { useMemo } from "react";
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

type GrowthKey = "incomeGrowthPct" | "expensesGrowthPct" | "savingsGrowthPct" | "netBalanceGrowthPct";
type ValueKey = "totalIncome" | "totalExpenses" | "savingsAndInvestments" | "netBalance";

const CARD_DEFINITIONS: readonly {
  label: string; valueKey: ValueKey; growthKey: GrowthKey; icon: typeof TrendingUp;
  tone: "success" | "expense" | "purple" | "investment"; expense: boolean;
}[] = [
  { label: "Ingresos totales", valueKey: "totalIncome", growthKey: "incomeGrowthPct", icon: TrendingUp, tone: "success", expense: false },
  { label: "Gastos totales", valueKey: "totalExpenses", growthKey: "expensesGrowthPct", icon: ArrowDown, tone: "expense", expense: true },
  { label: "Ahorro / Inversión", valueKey: "savingsAndInvestments", growthKey: "savingsGrowthPct", icon: Layers, tone: "purple", expense: false },
  { label: "Balance neto", valueKey: "netBalance", growthKey: "netBalanceGrowthPct", icon: Wallet, tone: "investment", expense: false },
];

export function ReportsKpiCards({ kpis, selectedCurrency }: ReportsKpiCardsProps) {
  const cards = useMemo(() => CARD_DEFINITIONS.map((definition) => {
    const growth = kpis[definition.growthKey];
    // null = no prior-period baseline: show "—", never a fabricated 0%.
    const change = growth === null || !Number.isFinite(growth) ? null : new Decimal(growth).toDecimalPlaces(1, Decimal.ROUND_HALF_UP);
    const favorable = change !== null && (definition.expense ? change.isNegative() : change.isPositive() && !change.isZero());
    return { ...definition, value: kpis[definition.valueKey], change, favorable };
  }), [kpis]);

  // Container query: 4 columns only when each card can be ~250px wide (the amount is
  // text-xl next to a 56px icon); the card row sits beside the sidebar, so the viewport is not a reliable proxy.
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2 @min-[1040px]:grid-cols-4">
        {cards.map(({ label, value, change, favorable, icon: Icon, tone }) => (
          <Card key={label} className="min-w-0 border-border/80">
            <CardContent className="flex items-start gap-3 p-4">
              <Badge variant={tone} aria-hidden="true" className="size-14 shrink-0 p-0 [&>svg]:size-7">
                <Icon />
              </Badge>
              <div className="min-w-0">
                <h2 className="text-sm font-medium">{label}</h2>
                <p className="my-1 break-words text-xl font-bold tracking-tight tabular-nums">
                  <Amount value={value} currency={selectedCurrency} size="inherit" tone="inherit" />
                </p>
                {change === null ? (
                  <Badge variant="outline" title="Sin período anterior para comparar">—</Badge>
                ) : (
                  <Badge variant={change.isZero() ? "secondary" : favorable ? "success" : "expense"} title="Variación respecto al período anterior">
                    <Percentage value={change} sign="always" size="inherit" tone="inherit" />
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
