"use client";

import React from "react";
import { Landmark, Wallet, Calendar, Target, FileText, Percent } from "lucide-react";
import { Investment } from "../../domain/investment.types";
import { InvestmentDetailMetrics } from "../../domain/investment-detail";

interface InvestmentInfoCardProps {
  investment: Investment;
  metrics: InvestmentDetailMetrics;
  platform?: string;
  fees?: number;
  currency?: string;
}

export function InvestmentInfoCard({
  investment,
  metrics,
  platform = "Binance",
  fees = 0,
  currency = "$",
}: InvestmentInfoCardProps) {
  const startDate = new Date(investment.createdAt).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const kindLabel =
    investment.kind === "crypto"
      ? "Criptomoneda"
      : investment.kind === "stocks"
      ? "Acción de mercado"
      : investment.kind === "funds"
      ? "Fondo / ETF"
      : investment.kind === "realestate"
      ? "Bienes raíces"
      : "Otro activo";

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col gap-4">
      <h3 className="text-base font-bold text-foreground tracking-tight">
        Información de la inversión
      </h3>

      <div className="flex flex-col divide-y divide-border/40 text-xs">
        {/* Tipo */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Landmark className="w-3.5 h-3.5 text-purple-400" />
            <span>Tipo</span>
          </div>
          <span className="font-bold text-foreground">{kindLabel}</span>
        </div>

        {/* Plataforma */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Wallet className="w-3.5 h-3.5 text-cyan-400" />
            <span>Plataforma</span>
          </div>
          <span className="font-bold text-foreground">{platform}</span>
        </div>

        {/* Fecha de inicio */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Fecha de inicio</span>
          </div>
          <span className="font-bold text-foreground">{startDate}</span>
        </div>

        {/* Inversión inicial */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Target className="w-3.5 h-3.5 text-teal-400" />
            <span>Inversión inicial</span>
          </div>
          <span className="font-bold font-mono text-foreground">
            {currency} {metrics.initialValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Costo total */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>Costo total</span>
          </div>
          <span className="font-bold font-mono text-foreground">
            {currency} {metrics.initialValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Comisiones */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Percent className="w-3.5 h-3.5 text-pink-400" />
            <span>Comisiones</span>
          </div>
          <span className="font-bold font-mono text-foreground">
            {currency} {fees.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
