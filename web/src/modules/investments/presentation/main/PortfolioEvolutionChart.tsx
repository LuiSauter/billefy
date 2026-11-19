"use client";

import React from "react";
import { PortfolioEvolutionPoint } from "../../domain/portfolio-analytics";
import { EvolutionAreaChart } from "../EvolutionAreaChart";

interface PortfolioEvolutionChartProps {
  points: PortfolioEvolutionPoint[];
  currentValue: number;
  currency?: string;
}

export function PortfolioEvolutionChart({ points, currentValue, currency = "USD" }: PortfolioEvolutionChartProps) {
  return (
    <EvolutionAreaChart
      title="Evolución del portafolio"
      points={points}
      currentValue={currentValue}
      currency={currency}
      variant="purple"
    />
  );
}
