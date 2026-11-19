"use client";

import React, { useState, useMemo } from "react";
import { usePatrimonio } from "../application/usePatrimonio";
import { calculatePatrimonioOverview } from "../domain/net-worth-analytics";
import { Investment } from "@/modules/investments/domain/investment.types";
import { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { Skeleton } from "@/shared/ui/skeleton";

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
import { AddFinancialItemModal } from "./modals/AddFinancialItemModal";

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

// Module-scope defaults keep prop identity stable across renders so the memoized overview is not busted.
const NO_INVESTMENTS: Investment[] = [];
const NO_ACCOUNTS: AccountDto[] = [];
const NO_LOANS: LoanSummaryDto[] = [];
const NO_TRANSACTIONS: TransactionDto[] = [];

/** Placeholder with the final layout, shown until the user's manual records have been read from storage. */
function PatrimonioLoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 @md:grid-cols-2 @4xl:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[148px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 @5xl:grid-cols-12 gap-5">
        <Skeleton className="h-72 rounded-2xl @5xl:col-span-7" />
        <Skeleton className="h-72 rounded-2xl @5xl:col-span-5" />
      </div>
      <div className="grid grid-cols-1 @4xl:grid-cols-12 gap-6">
        <div className="flex flex-col gap-6 @4xl:col-span-7 @5xl:col-span-8">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <div className="flex flex-col gap-5 @4xl:col-span-5 @5xl:col-span-4">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function PatrimonioView({
  investments = NO_INVESTMENTS,
  accounts = NO_ACCOUNTS,
  loans = NO_LOANS,
  transactions = NO_TRANSACTIONS,
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
    loaded,
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

  const header = (
    <PatrimonioHeader
      onOpenAddAsset={() => setAddAssetOpen(true)}
      onOpenAddLiability={() => setAddLiabilityOpen(true)}
      selectedCurrency={targetCurrency}
      onToggleCurrency={onToggleCurrency}
      p2pRate={effectiveP2pRate}
      loading={!loaded}
    />
  );

  if (!loaded) {
    return (
      <div className="@container flex flex-col gap-6" aria-busy="true">
        {header}
        <PatrimonioLoadingState />
      </div>
    );
  }

  return (
    <div className="@container flex flex-col gap-6">
      {/* 1. Header with as-of label, Currency Toggle & "+ Agregar activo" */}
      {header}

      {/* 2. Top 4 KPI Cards: Patrimonio Neto, Activos, Pasivos, Ratio de endeudamiento */}
      <PatrimonioKpiCards
        metrics={metrics}
        currency={targetCurrency}
        targetCurrency={targetCurrency}
        p2pRate={effectiveP2pRate}
      />

      {/* 3. Middle Section: Evolución del patrimonio neto & Distribución de activos Donut */}
      <div className="grid grid-cols-1 @5xl:grid-cols-12 gap-5 items-stretch">
        {/* Left (7 cols): Evolución */}
        <div className="@5xl:col-span-7 flex flex-col min-w-0">
          <PatrimonioEvolutionChart
            points={metrics.evolutionPoints}
            currentNetWorth={metrics.netWorth}
            currency={targetCurrency}
          />
        </div>

        {/* Right (5 cols): Distribución Donut */}
        <div className="@5xl:col-span-5 flex flex-col min-w-0">
          <PatrimonioDistributionDonut
            categories={metrics.assetsByCategory}
            totalAssets={metrics.totalAssets}
            currency={targetCurrency}
          />
        </div>
      </div>

      {/* 4. Bottom Section: Mis Activos / Mis Pasivos (8 cols) & Composición / Insights (4 cols) */}
      <div className="grid grid-cols-1 @4xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Mis activos & Mis pasivos lists with drill-down & deletion */}
        <div className="@4xl:col-span-7 @5xl:col-span-8 flex flex-col gap-6 min-w-0">
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
        <div className="@4xl:col-span-5 @5xl:col-span-4 flex flex-col gap-5 min-w-0">
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
      <AddFinancialItemModal
        kind="asset"
        isOpen={addAssetOpen}
        onClose={() => setAddAssetOpen(false)}
        onAddAsset={addAsset}
        defaultCurrency={targetCurrency}
      />

      <AddFinancialItemModal
        kind="liability"
        isOpen={addLiabilityOpen}
        onClose={() => setAddLiabilityOpen(false)}
        onAddLiability={addLiability}
        defaultCurrency={targetCurrency}
      />
    </div>
  );
}
