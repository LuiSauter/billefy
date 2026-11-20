"use client";

import React from "react";
import { TrendingUp, Layers, ArrowUpRight, Percent } from "lucide-react";
import { InvestmentDetailMetrics } from "../../domain/investment-detail";
import { Amount, Percentage } from "@/shared/ui/amount";
import { InvestmentsCard } from "../InvestmentsCard";

interface InvestmentDetailKpisProps {
  metrics: InvestmentDetailMetrics;
  currency?: string;
}

function KpiCard({ icon, iconClassName, label, children }: { icon: React.ReactNode; iconClassName: string; label: string; children: React.ReactNode }) {
  return (
    <InvestmentsCard className="p-4 flex flex-row items-center gap-3.5 min-w-0">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconClassName}`}>{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-semibold text-muted-foreground truncate">{label}</span>
        {children}
      </div>
    </InvestmentsCard>
  );
}

export function InvestmentDetailKpis({
  metrics,
  currency = "USD",
}: InvestmentDetailKpisProps) {
  const isPositiveGain = metrics.gainLoss >= 0;

  return (
    // The cards live in a column that is narrower than the viewport: size the grid from the column itself.
    <div className="@container">
      <div className="grid grid-cols-1 @md:grid-cols-2 @4xl:grid-cols-4 gap-3.5">
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} iconClassName="bg-purple-500/15 text-purple-400 border-purple-500/20" label="Inversión total">
          {metrics.costBasis === null ? (
            <span className="text-xs text-muted-foreground">Costo histórico pendiente</span>
          ) : (
            <Amount value={metrics.costBasis ?? metrics.initialValue} currency={currency} size="lg" className="min-w-0 truncate" />
          )}
        </KpiCard>

        <KpiCard icon={<Layers className="w-4 h-4" />} iconClassName="bg-teal-500/15 text-teal-400 border-teal-500/20" label="Valor actual">
          <Amount value={metrics.currentValue} currency={currency} size="lg" className="min-w-0 truncate" />
        </KpiCard>

        <KpiCard
          icon={<ArrowUpRight className="w-4 h-4" />}
          iconClassName={isPositiveGain ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-rose-500/15 text-rose-400 border-rose-500/20"}
          label="Ganancia / Pérdida"
        >
          {metrics.costBasis === null ? (
            <span className="text-xs text-muted-foreground">No disponible</span>
          ) : (
            <Amount value={metrics.gainLoss} currency={currency} sign="always" tone={isPositiveGain ? "income" : "expense"} size="lg" className="min-w-0 truncate" />
          )}
        </KpiCard>

        <KpiCard icon={<Percent className="w-4 h-4" />} iconClassName="bg-purple-500/15 text-purple-400 border-purple-500/20" label="ROI">
          {metrics.costBasis === null ? (
            <span className="text-xs text-muted-foreground">No disponible</span>
          ) : (
            <Percentage value={metrics.roiPct} sign="always" tone="auto" size="lg" className="min-w-0 truncate" />
          )}
        </KpiCard>
      </div>
    </div>
  );
}
