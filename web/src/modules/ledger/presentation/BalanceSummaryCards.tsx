"use client";

import React from "react";
import { BalanceMetrics } from "@/modules/dashboard/application/useFinancialMetrics";

interface BalanceSummaryCardsProps {
  metrics: BalanceMetrics;
  p2pRate?: number;
  selectedCurrency?: "BOB" | "USD";
  hasAccounts?: boolean;
}

export function BalanceSummaryCards({
  metrics,
  p2pRate = 9.85,
  selectedCurrency = "BOB",
  hasAccounts = true,
}: BalanceSummaryCardsProps) {
  const isBob = selectedCurrency === "BOB";
  const mainPatrimonio = isBob
    ? `Bs. ${metrics.totalPatrimonioBob}`
    : `$${metrics.consolidatedUsd} USD`;

  const subPatrimonio = isBob
    ? `≈ $${metrics.consolidatedUsd} USD (P2P Bs ${p2pRate.toFixed(2)})`
    : `≈ Bs. ${metrics.totalPatrimonioBob} (P2P Bs ${p2pRate.toFixed(2)})`;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Patrimonio Total (OpenPencil KCard_0) */}
      <div className="p-4 rounded-[14px] bg-card border border-border flex flex-col gap-[6px] shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            Patrimonio Total
          </span>
          <span
            className={`text-xs font-bold ${
              hasAccounts ? "text-emerald-400" : "text-muted-foreground"
            }`}
          >
            {hasAccounts ? "Consolidado" : "Sin cuentas"}
          </span>
        </div>
        <div className="text-[22px] font-black text-foreground tracking-tight font-mono">
          {mainPatrimonio}
        </div>
        <div className="text-xs font-medium text-muted-foreground font-mono">
          {subPatrimonio}
        </div>
      </div>

      {/* 2. Liquidez en Bancos (OpenPencil KCard_1) */}
      <div className="p-4 rounded-[14px] bg-card border border-border flex flex-col gap-[6px] shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            Liquidez en Bancos
          </span>
          <span className="text-xs font-bold text-primary">
            {hasAccounts ? "Disponible" : "Sin balance"}
          </span>
        </div>
        <div className="text-[22px] font-black text-foreground tracking-tight font-mono">
          Bs. {metrics.bankLiquidityBob}
        </div>
        <div className="text-xs font-medium text-muted-foreground">
          Saldos en moneda nacional (BOB)
        </div>
      </div>

      {/* 3. Cripto (Binance) (OpenPencil KCard_2) */}
      <div className="p-4 rounded-[14px] bg-card border border-border flex flex-col gap-[6px] shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            Cripto (Binance)
          </span>
          <span className="text-xs font-bold text-amber-400">
            Bs. {metrics.cryptoEquivalentBob}
          </span>
        </div>
        <div className="text-[22px] font-black text-foreground tracking-tight font-mono">
          {metrics.cryptoUsdt} USDT
        </div>
        <div className="text-xs font-medium text-muted-foreground">
          Tether evaluado al cambio P2P
        </div>
      </div>

      {/* 4. Préstamos Netos (OpenPencil KCard_3) */}
      <div className="p-4 rounded-[14px] bg-card border border-border flex flex-col gap-[6px] shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            Préstamos Netos
          </span>
          <span className="text-xs font-bold text-violet-400">
            {metrics.isNetLoansPositive ? "A favor" : "Por pagar"}
          </span>
        </div>
        <div
          className={`text-[22px] font-black tracking-tight font-mono ${
            metrics.isNetLoansPositive ? "text-foreground" : "text-rose-400"
          }`}
        >
          {metrics.netLoansBob}
        </div>
        <div className="text-xs font-medium text-muted-foreground">
          Diferencial entre cobros y pagos
        </div>
      </div>
    </section>
  );
}
