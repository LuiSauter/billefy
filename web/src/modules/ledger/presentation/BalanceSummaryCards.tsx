"use client";

import React from "react";
import { BalanceMetrics } from "@/modules/dashboard/application/useFinancialMetrics";
import { Amount } from "@/shared/ui/amount";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { AccountBalanceDisplay } from "./AccountBalanceDisplay";

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
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Patrimonio Total */}
      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            Patrimonio Total
          </span>
          <Badge variant={hasAccounts ? "success" : "outline"} className="text-xs">
            {hasAccounts ? "Consolidado" : "Sin cuentas"}
          </Badge>
        </div>
        <AccountBalanceDisplay
          bobAmount={metrics.totalPatrimonioBob}
          usdAmount={metrics.consolidatedUsd}
          p2pRate={p2pRate}
          selectedCurrency={selectedCurrency}
          size="lg"
        />
      </Card>

      {/* 2. Liquidez en Bancos */}
      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            Liquidez en Bancos
          </span>
          <Badge variant={hasAccounts ? "outline" : "outline"} className="text-xs text-primary">
            {hasAccounts ? "Disponible" : "Sin balance"}
          </Badge>
        </div>
        <Amount value={metrics.bankLiquidityBob} currency="BOB" size="lg" />
        <div className="text-xs text-muted-foreground">
          Saldos en moneda nacional (BOB)
        </div>
      </Card>

      {/* 3. Cripto (Binance) */}
      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            Cripto (Binance)
          </span>
          <Amount value={metrics.cryptoEquivalentBob} currency="BOB" size="xs" className="text-muted-foreground" />
        </div>
        <Amount value={metrics.cryptoUsdt} currency="USDT" size="lg" />
        <div className="text-xs text-muted-foreground">
          Tether evaluado al cambio P2P
        </div>
      </Card>

      {/* 4. Préstamos Netos */}
      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            Préstamos Netos
          </span>
          <Badge variant="outline" className="text-xs">
            {metrics.isNetLoansPositive ? "A favor" : "Por pagar"}
          </Badge>
        </div>
        <Amount
          value={metrics.netLoansBob}
          currency="BOB"
          size="lg"
          tone={metrics.isNetLoansPositive ? "neutral" : "expense"}
        />
        <div className="text-xs text-muted-foreground">
          Diferencial entre cobros y pagos
        </div>
      </Card>
    </section>
  );
}
