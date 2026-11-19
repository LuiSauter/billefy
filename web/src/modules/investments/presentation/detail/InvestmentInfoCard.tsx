"use client";

import React from "react";
import { Landmark, Wallet, Calendar, Target, FileText, Percent } from "lucide-react";
import { Investment, getKindLabel } from "../../domain/investment.types";
import { InvestmentDetailMetrics } from "../../domain/investment-detail";
import { Amount } from "@/shared/ui/amount";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { InvestmentsCard } from "../InvestmentsCard";

interface InvestmentInfoCardProps {
  investment: Investment;
  metrics: InvestmentDetailMetrics;
  /** Where the position is held. Hidden when unknown: the API has no per-investment platform. */
  platform?: string;
  /** Total fees paid, in the investment currency. Hidden when unknown (operations not loaded). */
  fees?: number;
  currency?: string;
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-muted-foreground font-medium shrink-0">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-bold text-foreground text-right min-w-0">{children}</span>
    </div>
  );
}

export function InvestmentInfoCard({
  investment,
  metrics,
  platform,
  fees,
  currency = "USD",
}: InvestmentInfoCardProps) {
  const startDate = new Date(investment.createdAt).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <InvestmentsCard>
      <CardHeader className={appCardHeaderClassName}>
        <CardTitle className={appCardTitleClassName}>Información de la inversión</CardTitle>
      </CardHeader>

      <CardContent className={`${appCardContentClassName} flex flex-col divide-y divide-border/40 text-xs`}>
        <InfoRow icon={<Landmark className="w-3.5 h-3.5 text-purple-400" />} label="Tipo">
          {getKindLabel(investment.kind)}
        </InfoRow>

        {platform && (
          <InfoRow icon={<Wallet className="w-3.5 h-3.5 text-cyan-400" />} label="Plataforma">
            {platform}
          </InfoRow>
        )}

        <InfoRow icon={<Calendar className="w-3.5 h-3.5 text-amber-400" />} label="Fecha de inicio">
          {startDate}
        </InfoRow>

        <InfoRow icon={<Target className="w-3.5 h-3.5 text-teal-400" />} label="Inversión inicial">
          <Amount value={metrics.initialValue} currency={currency} size="inherit" tone="inherit" />
        </InfoRow>

        <InfoRow icon={<FileText className="w-3.5 h-3.5 text-purple-400" />} label="Costo total">
          {metrics.costBasis === null ? (
            "Costo histórico pendiente"
          ) : (
            <Amount value={metrics.costBasis ?? metrics.initialValue} currency={currency} size="inherit" tone="inherit" />
          )}
        </InfoRow>

        {fees !== undefined && (
          <InfoRow icon={<Percent className="w-3.5 h-3.5 text-pink-400" />} label="Comisiones">
            <Amount value={fees} currency={currency} size="inherit" tone="inherit" />
          </InfoRow>
        )}
      </CardContent>
    </InvestmentsCard>
  );
}
