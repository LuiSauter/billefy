"use client";

import React, { useState, useMemo } from "react";
import { getCurrencyMeta } from "@/shared/lib/currency";
import { usePatrimonio } from "../application/usePatrimonio";
import { calculatePatrimonioOverview } from "../domain/net-worth-analytics";
import { Investment } from "@/modules/investments/domain/investment.types";
import { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";

// Presentation Subcomponents
import { PatrimonioHeader } from "./PatrimonioHeader";
import { PatrimonioKpiCards } from "./PatrimonioKpiCards";
import { PatrimonioEvolutionChart } from "./PatrimonioEvolutionChart";
import { PatrimonioDistributionDonut } from "./PatrimonioDistributionDonut";
import { PatrimonioAssetsList } from "./PatrimonioAssetsList";
import { PatrimonioLiabilitiesList } from "./PatrimonioLiabilitiesList";
import { PatrimonioCompositionBar } from "./PatrimonioCompositionBar";
import { PatrimonioInsightsCard } from "./PatrimonioInsightsCard";

// Modals
import { AddAssetModal } from "./modals/AddAssetModal";
import { AddLiabilityModal } from "./modals/AddLiabilityModal";

interface PatrimonioViewProps {
  investments: Investment[];
  accounts: AccountDto[];
  loans: LoanSummaryDto[];
  transactions?: TransactionDto[];
  onNavigateToInvestments?: () => void;
  selectedCurrency?: "BOB" | "USD";
  onToggleCurrency?: () => void;
  p2pRate?: number;
}

export function PatrimonioView({
  investments = [],
  accounts = [],
  loans = [],
  transactions = [],
  onNavigateToInvestments,
  selectedCurrency = "BOB",
  onToggleCurrency,
  p2pRate = 9.85,
}: PatrimonioViewProps) {
  const {
    manualAssets,
    manualLiabilities,
    addAsset,
    deleteAsset,
    addLiability,
    deleteLiability,
  } = usePatrimonio();

  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [addLiabilityOpen, setAddLiabilityOpen] = useState(false);

  const targetCurrency: "USD" | "BOB" = selectedCurrency || "USD";
  const effectiveP2pRate = p2pRate > 0 ? p2pRate : 9.85;

  // Consolidated authentic calculation
  const metrics = useMemo(() => {
    return calculatePatrimonioOverview({
      manualAssets,
      investments,
      accounts,
      loans,
      manualLiabilities,
      transactions,
      targetCurrency,
      p2pRate: effectiveP2pRate,
    });
  }, [
    manualAssets,
    investments,
    accounts,
    loans,
    manualLiabilities,
    transactions,
    targetCurrency,
    effectiveP2pRate,
  ]);

  const handleSelectAssetCategory = (category: string) => {
    if (category === "investments" && onNavigateToInvestments) {
      onNavigateToInvestments();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header with Period Selector, Currency Toggle & "+ Agregar activo" */}
      <PatrimonioHeader
        onOpenAddAsset={() => setAddAssetOpen(true)}
        onOpenAddLiability={() => setAddLiabilityOpen(true)}
        selectedCurrency={targetCurrency}
        onToggleCurrency={onToggleCurrency}
        p2pRate={effectiveP2pRate}
      />

      {/* 2. Top 4 KPI Cards: Patrimonio Neto, Activos, Pasivos, Ratio de endeudamiento */}
      <PatrimonioKpiCards
        metrics={metrics}
        currency={targetCurrency}
        targetCurrency={targetCurrency}
        p2pRate={effectiveP2pRate}
      />

      {/* 3. Middle Section: Evolución del patrimonio neto & Distribución de activos Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left (7 cols): Evolución */}
        <div className="lg:col-span-7 flex flex-col">
          <PatrimonioEvolutionChart
            points={metrics.evolutionPoints}
            currentNetWorth={metrics.netWorth}
            currency={targetCurrency}
          />
        </div>

        {/* Right (5 cols): Distribución Donut */}
        <div className="lg:col-span-5 flex flex-col">
          <PatrimonioDistributionDonut
            categories={metrics.assetsByCategory}
            totalAssets={metrics.totalAssets}
            currency={targetCurrency}
          />
        </div>
      </div>

      {/* 4. Bottom Section: Mis Activos / Mis Pasivos (8 cols) & Composición / Insights (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Mis activos & Mis pasivos lists with drill-down & deletion */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <PatrimonioAssetsList
            categories={metrics.assetsByCategory}
            totalAssets={metrics.totalAssets}
            onSelectCategory={handleSelectAssetCategory}
            onDeleteAsset={deleteAsset}
            currency={targetCurrency}
          />

          <PatrimonioLiabilitiesList
            categories={metrics.liabilitiesByCategory}
            totalLiabilities={metrics.totalLiabilities}
            onDeleteLiability={deleteLiability}
            currency={targetCurrency}
          />
        </div>

        {/* Right Column (4 cols): Composición general & Insights */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5">
          <PatrimonioCompositionBar
            totalAssets={metrics.totalAssets}
            totalLiabilities={metrics.totalLiabilities}
            netWorth={metrics.netWorth}
            assetsPct={metrics.composition.assetsPct}
            liabilitiesPct={metrics.composition.liabilitiesPct}
            currency={targetCurrency}
          />

          <PatrimonioInsightsCard insights={metrics.insights} />
        </div>
      </div>

      {/* Modals */}
      <AddAssetModal
        isOpen={addAssetOpen}
        onClose={() => setAddAssetOpen(false)}
        onAddAsset={addAsset}
        currencySymbol={getCurrencyMeta(targetCurrency).symbol}
        defaultCurrency={targetCurrency}
      />

      <AddLiabilityModal
        isOpen={addLiabilityOpen}
        onClose={() => setAddLiabilityOpen(false)}
        onAddLiability={addLiability}
        currencySymbol={getCurrencyMeta(targetCurrency).symbol}
        defaultCurrency={targetCurrency}
      />
    </div>
  );
}
