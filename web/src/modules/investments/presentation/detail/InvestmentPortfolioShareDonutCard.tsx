"use client";

import React, { useMemo } from "react";
import { Investment } from "../../domain/investment.types";
import { Percentage } from "@/shared/ui/amount";
import { DistributionDonutCard, DonutSlice } from "../DistributionDonutCard";

interface InvestmentPortfolioShareDonutCardProps {
  currentInvestment: Investment;
  allInvestments: Investment[];
  currency?: string;
}

const PALETTE = ["#10b981", "#a855f7", "#06b6d4", "#f59e0b", "#64748b", "#ec4899"];
const CURRENT_COLOR = "#10b981";
const MAX_SLICES = 5;

export function InvestmentPortfolioShareDonutCard({
  currentInvestment,
  allInvestments,
  currency = "USD",
}: InvestmentPortfolioShareDonutCardProps) {
  const slices = useMemo<DonutSlice[]>(() => {
    const total = allInvestments.reduce((acc, i) => acc + (i.currentValue || 0), 0);
    // Current investment first, then the largest remaining positions.
    const sorted = [...allInvestments].sort((a, b) => {
      if (a.id === currentInvestment.id) return -1;
      if (b.id === currentInvestment.id) return 1;
      return b.currentValue - a.currentValue;
    });
    return sorted.slice(0, MAX_SLICES).map((inv, idx) => ({
      id: inv.id,
      label: inv.name,
      value: inv.currentValue,
      percentage: Number((total > 0 ? (inv.currentValue / total) * 100 : 0).toFixed(1)),
      color: inv.id === currentInvestment.id ? CURRENT_COLOR : PALETTE[(idx + 1) % PALETTE.length],
    }));
  }, [allInvestments, currentInvestment.id]);

  const currentPct = slices.find((s) => s.id === currentInvestment.id)?.percentage ?? 0;

  return (
    <DistributionDonutCard
      title="Distribución en mi portafolio"
      slices={slices}
      currency={currency}
      highlightId={currentInvestment.id}
      centerPrimary={<Percentage value={currentPct} sign="never" size="inherit" tone="inherit" />}
      centerSecondary="del total"
    />
  );
}
