"use client";

import React, { useMemo } from "react";
import { CategoryDistributionItem } from "../../domain/portfolio-analytics";
import { Amount } from "@/shared/ui/amount";
import { DistributionDonutCard, DonutSlice } from "../DistributionDonutCard";

interface PortfolioDistributionDonutCardProps {
  distribution: CategoryDistributionItem[];
  totalValue: number;
  currency?: string;
}

export function PortfolioDistributionDonutCard({
  distribution,
  totalValue,
  currency = "USD",
}: PortfolioDistributionDonutCardProps) {
  const slices = useMemo<DonutSlice[]>(
    () =>
      distribution.map((item) => ({
        id: item.kind,
        label: item.label,
        value: item.totalValue,
        percentage: item.percentage,
        color: item.color,
      })),
    [distribution]
  );

  return (
    <DistributionDonutCard
      title="Distribución por tipo de inversión"
      slices={slices}
      currency={currency}
      centerPrimary={<Amount value={totalValue} currency={currency} size="inherit" tone="inherit" />}
      centerSecondary="Total invertido"
    />
  );
}
