"use client";

import React, { useState, useMemo } from "react";
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

interface InvestmentDetailViewProps {
  investment: Investment;
  allInvestments: Investment[];
  transactions?: InvestmentTransactionDto[];
  onBack: () => void;
  onOpenUpdatePrice: (investment: Investment) => void;
  onOpenEditInvestment: (investment: Investment) => void;
  onOpenOperation: (investment: Investment, type: "buy" | "sell" | "cash") => void;
  currency?: string;
}

export function InvestmentDetailView({
  investment,
  allInvestments,
  transactions,
  onBack,
  onOpenUpdatePrice,
  onOpenEditInvestment,
  onOpenOperation,
  currency = "$",
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
    if (transactions && transactions.length > 0) {
      return mapTransactionsToOperations(transactions);
    }
    return getDerivedOperations(investment);
  }, [investment, transactions]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header with back button & quick actions */}
      <InvestmentDetailHeader
        onBack={onBack}
        onOpenUpdatePrice={() => onOpenUpdatePrice(investment)}
        onOpenEditInvestment={() => onOpenEditInvestment(investment)}
        onOpenOperation={(type) => onOpenOperation(investment, type)}
      />

      {/* 2. Hero Asset Card */}
      <InvestmentHeroCard
        investment={investment}
        metrics={metrics}
        currency={currency}
        onOpenEdit={() => onOpenEditInvestment(investment)}
      />

      {/* 3. Detail Tabs Bar */}
      <InvestmentDetailTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        operationsCount={operations.length}
        alertsCount={2}
      />

      {/* Tab: Resumen */}
      {activeTab === "resumen" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Left Column (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
            {/* 2 Top Charts side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* 4 Mini KPI Cards */}
            <InvestmentDetailKpis metrics={metrics} currency={currency} />

            {/* Recent Operations Table */}
            <InvestmentOperationsTable
              operations={operations.slice(0, 5)}
              currencySymbol={currency}
              assetTicker={investment.currency}
              onViewAll={() => setActiveTab("operaciones")}
            />
          </div>

          {/* Side Right Column (4 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
            <InvestmentInfoCard
              investment={investment}
              metrics={metrics}
              currency={currency}
            />

            <InvestmentNotesCard />

            <InvestmentPriceAlertsCard
              investmentId={investment.id}
              currencySymbol={currency}
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
            <button
              type="button"
              onClick={() => onOpenOperation(investment, "buy")}
              className="h-9 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer"
            >
              + Registrar operación
            </button>
          </div>

          <InvestmentOperationsTable
            operations={operations}
            currencySymbol={currency}
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
            currencySymbol={currency}
          />
        </div>
      )}

      {/* Tab: Documentos */}
      {activeTab === "documentos" && (
        <div className="max-w-2xl flex flex-col gap-4">
          <InvestmentNotesCard />
          <div className="p-6 rounded-2xl border border-dashed border-border/80 text-center text-xs text-muted-foreground bg-card/40">
            Adjuntos y comprobantes de compra/venta para esta inversión estarán disponibles próximamente.
          </div>
        </div>
      )}
    </div>
  );
}
