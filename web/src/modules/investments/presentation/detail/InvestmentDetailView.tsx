"use client";

import React, { useState, useMemo } from "react";
import Decimal from "decimal.js";
import { Investment, InvestmentTransactionDto } from "../../domain/investment.types";
import {
  calculateInvestmentDetailMetrics,
  calculateAssetEvolutionPoints,
  getDerivedOperations,
  mapTransactionsToOperations,
} from "../../domain/investment-detail";
import { InvestmentDetailHeader } from "./InvestmentDetailHeader";
import { InvestmentHeroCard } from "./InvestmentHeroCard";
import { InvestmentDetailTabs, InvestmentDetailTabKey } from "./InvestmentDetailTabs";
import { InvestmentValueEvolutionChart } from "./InvestmentValueEvolutionChart";
import { InvestmentPortfolioShareDonutCard } from "./InvestmentPortfolioShareDonutCard";
import { InvestmentDetailKpis } from "./InvestmentDetailKpis";
import { InvestmentOperationsTable } from "./InvestmentOperationsTable";
import { InvestmentInfoCard } from "./InvestmentInfoCard";
import { InvestmentNotesCard } from "./InvestmentNotesCard";
import { InvestmentPriceAlertsCard } from "./InvestmentPriceAlertsCard";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

interface InvestmentDetailViewProps {
  investment: Investment;
  allInvestments: Investment[];
  transactions?: InvestmentTransactionDto[];
  onBack: () => void;
  onOpenUpdatePrice: (investment: Investment) => void;
  /** Opens the archive confirmation for this investment. */
  onOpenArchiveInvestment: (investment: Investment) => void;
  onOpenOperation: (investment: Investment, type: "buy" | "sell" | "cash") => void;
  currency?: string;
}

export function InvestmentDetailView({
  investment,
  allInvestments,
  transactions,
  onBack,
  onOpenUpdatePrice,
  onOpenArchiveInvestment,
  onOpenOperation,
  currency = "USD",
}: InvestmentDetailViewProps) {
  const [activeTab, setActiveTab] = useState<InvestmentDetailTabKey>("resumen");
  const [evolutionMonths, setEvolutionMonths] = useState(6);

  const metrics = useMemo(() => {
    return calculateInvestmentDetailMetrics(investment, allInvestments);
  }, [investment, allInvestments]);

  const evolutionPoints = useMemo(() => {
    return calculateAssetEvolutionPoints(investment, evolutionMonths);
  }, [investment, evolutionMonths]);

  const operations = useMemo(() => {
    // An explicit server list, including empty/loading/error state, must not fabricate purchases from current units.
    if (transactions !== undefined) {
      return mapTransactionsToOperations(transactions);
    }
    return getDerivedOperations(investment);
  }, [investment, transactions]);

  const recentOperations = useMemo(() => operations.slice(0, 5), [operations]);

  // Real fees come from the server operations only; unknown (undefined) hides the row instead of showing 0.
  const totalFees = useMemo(
    () => (transactions === undefined ? undefined : transactions.reduce((acc, t) => acc.plus(t.fees || 0), new Decimal(0)).toNumber()),
    [transactions]
  );

  return (
    <div className="@container flex flex-col gap-6">
      {/* 1. Header with back button & quick actions */}
      <InvestmentDetailHeader
        onBack={onBack}
        onOpenUpdatePrice={() => onOpenUpdatePrice(investment)}
        onOpenArchiveInvestment={() => onOpenArchiveInvestment(investment)}
        onOpenOperation={(type) => onOpenOperation(investment, type)}
      />

      {/* 2. Hero Asset Card */}
      <InvestmentHeroCard
        investment={investment}
        metrics={metrics}
        currency={currency}
        onArchive={() => onOpenArchiveInvestment(investment)}
      />

      {/* 3. Detail Tabs Bar */}
      <InvestmentDetailTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        operationsCount={operations.length}
      />

      {/* Tab: Resumen */}
      {activeTab === "resumen" && (
        <div className="grid grid-cols-1 @4xl:grid-cols-12 gap-6 items-start">
          {/* Main Left Column (8 cols) */}
          <div className="@4xl:col-span-7 @5xl:col-span-8 flex flex-col gap-6 min-w-0">
            {/* 2 Top Charts side by side */}
            <div className="@container">
              <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-4">
                <InvestmentValueEvolutionChart
                  points={evolutionPoints}
                  currentValue={investment.currentValue}
                  currency={currency}
                  onPeriodChange={setEvolutionMonths}
                />

                <InvestmentPortfolioShareDonutCard
                  currentInvestment={investment}
                  allInvestments={allInvestments}
                  currency={currency}
                />
              </div>
            </div>

            {/* 4 Mini KPI Cards */}
            <InvestmentDetailKpis metrics={metrics} currency={currency} />

            {/* Recent Operations Table */}
            <InvestmentOperationsTable
              operations={recentOperations}
              currency={currency}
              assetTicker={investment.currency}
              onViewAll={() => setActiveTab("operaciones")}
            />
          </div>

          {/* Side Right Column (4 cols) */}
          <div className="@4xl:col-span-5 @5xl:col-span-4 flex flex-col gap-4 min-w-0">
            <InvestmentInfoCard
              investment={investment}
              metrics={metrics}
              currency={currency}
              fees={totalFees}
            />

            <InvestmentNotesCard />

            <InvestmentPriceAlertsCard
              investmentId={investment.id}
              currency={currency}
            />
          </div>
        </div>
      )}

      {/* Tab: Operaciones */}
      {activeTab === "operaciones" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Historial de Operaciones
              </h3>
              <p className="text-xs text-muted-foreground">
                Compras, ventas y valuaciones de {investment.name}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              onClick={() => onOpenOperation(investment, "buy")}
            >
              + Registrar operación
            </Button>
          </div>

          <InvestmentOperationsTable
            operations={operations}
            currency={currency}
            assetTicker={investment.currency}
          />
        </div>
      )}

      {/* Tab: Evolución */}
      {activeTab === "evolucion" && (
        <div className="flex flex-col gap-6">
          <InvestmentValueEvolutionChart
            points={evolutionPoints}
            currentValue={investment.currentValue}
            currency={currency}
            onPeriodChange={setEvolutionMonths}
          />
        </div>
      )}

      {/* Tab: Alertas */}
      {activeTab === "alertas" && (
        <div className="max-w-2xl">
          <InvestmentPriceAlertsCard
            investmentId={investment.id}
            currency={currency}
          />
        </div>
      )}

      {/* Tab: Documentos */}
      {activeTab === "documentos" && (
        <div className="max-w-2xl flex flex-col gap-4">
          <InvestmentNotesCard />
          <Card className="border-dashed border-border/80 bg-card/40 p-6 text-center text-xs text-muted-foreground shadow-none">
            Adjuntos y comprobantes de compra/venta para esta inversión estarán disponibles próximamente.
          </Card>
        </div>
      )}
    </div>
  );
}
