"use client";

import React, { useState } from "react";
import { AssetEvolutionPoint } from "../../domain/investment-detail";
import { EvolutionAreaChart } from "../EvolutionAreaChart";
import { PeriodDropdown } from "../PeriodDropdown";

interface InvestmentValueEvolutionChartProps {
  points: AssetEvolutionPoint[];
  currentValue: number;
  currency?: string;
  onPeriodChange?: (months: number) => void;
}

const PERIOD_CHOICES = [
  { value: "6", label: "Últimos 6 meses" },
  { value: "3", label: "Últimos 3 meses" },
  { value: "12", label: "Último año" },
  { value: "24", label: "Todo" },
];

export function InvestmentValueEvolutionChart({
  points,
  currentValue,
  currency = "USD",
  onPeriodChange,
}: InvestmentValueEvolutionChartProps) {
  const [months, setMonths] = useState("6");

  return (
    <EvolutionAreaChart
      title="Evolución del valor"
      points={points}
      currentValue={currentValue}
      currency={currency}
      variant="emerald"
      actions={
        <PeriodDropdown
          size="sm"
          aria-label="Período de evolución"
          options={PERIOD_CHOICES}
          value={months}
          onChange={(next) => {
            setMonths(next);
            onPeriodChange?.(Number(next));
          }}
        />
      }
    />
  );
}
