"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { InvestmentsController } from "../application/useInvestments";
import { Investment } from "../domain/investment.types";
import { calculatePortfolioOverview } from "../domain/portfolio-analytics";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { GoalDto } from "@/modules/planning/domain/planning.types";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { notify } from "@/shared/lib/notify";

// Subcomponents
import { InvestmentsHeader } from "./main/InvestmentsHeader";
import { InvestmentsKpiCards } from "./main/InvestmentsKpiCards";
import { PortfolioEvolutionChart } from "./main/PortfolioEvolutionChart";
import { PortfolioDistributionDonutCard } from "./main/PortfolioDistributionDonutCard";
import { InvestmentPerformanceListCard } from "./main/InvestmentPerformanceListCard";
import { InvestmentsTableCard } from "./main/InvestmentsTableCard";
import { InvestmentGoalsCard } from "./main/InvestmentGoalsCard";
import { InvestmentUpcomingEventsCard } from "./main/InvestmentUpcomingEventsCard";

// Detail View
import { InvestmentDetailView } from "./detail/InvestmentDetailView";

// Modals
import { UpdatePriceModal } from "./modals/UpdatePriceModal";
import { RegisterOperationModal } from "./modals/RegisterOperationModal";
import { CreateInvestmentModal } from "./modals/CreateInvestmentModal";
import { EditInvestmentModal } from "./modals/EditInvestmentModal";
import { InvestmentCashModal } from "./InvestmentCashModal";

interface InvestmentsViewProps {
  controller: InvestmentsController;
  p2pRate: number;
  accounts: AccountDto[];
  goals?: GoalDto[];
  onCashComplete: () => Promise<void>;
  onOpenCreateGoalModal?: () => void;
  onOpenBinanceModal?: () => void;
  currencySymbol?: string;
}

export function InvestmentsView({
  controller,
  accounts,
  goals = [],
  onCashComplete,
  onOpenCreateGoalModal,
  onOpenBinanceModal,
  currencySymbol = "$",
}: InvestmentsViewProps) {
  const {
    investments,
    createInvestment,
    updateInvestmentValue,
    deleteInvestment,
    recordCash,
  } = controller;

  const format = useNumberFormat();

  // Navigation State
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("6m");
  const [isSyncingBinance, setIsSyncingBinance] = useState(false);

  // Modal States
  const [createOpen, setCreateOpen] = useState(false);
  const [cashInvestment, setCashInvestment] = useState<Investment | null>(null);
  const [generalCashOpen, setGeneralCashOpen] = useState(false);
  const [updatePriceInvestment, setUpdatePriceInvestment] = useState<Investment | null>(null);
  const [editInvestment, setEditInvestment] = useState<Investment | null>(null);
  const [operationInvestment, setOperationInvestment] = useState<Investment | null>(null);

  // Auto-sync crypto prices once on load if user has crypto positions
  const hasAutoSynced = useRef(false);
  useEffect(() => {
    if (hasAutoSynced.current || investments.length === 0) return;
    const hasCrypto = investments.some((i) => i.kind === "crypto" && i.quantity > 0);
    if (hasCrypto) {
      hasAutoSynced.current = true;
      void controller.syncLiveCryptoPrices(investments);
    }
  }, [investments, controller]);

  const handleSyncBinance = async () => {
    setIsSyncingBinance(true);
    try {
      const res = await controller.syncBinancePortfolio();
      notify.success(res.message || `Se sincronizaron ${res.assetsSynced} activos desde Binance.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al sincronizar con Binance";
      notify.error(msg);
      if ((msg.includes("Configuración") || msg.includes("configuradas")) && onOpenBinanceModal) {
        onOpenBinanceModal();
      }
    } finally {
      setIsSyncingBinance(false);
    }
  };

  // Portfolio Overview calculations
  const overview = useMemo(() => {
    return calculatePortfolioOverview(investments);
  }, [investments]);

  // Selected Investment
  const selectedInvestment = useMemo(() => {
    if (!selectedInvestmentId) return null;
    return investments.find((i) => i.id === selectedInvestmentId) || null;
  }, [investments, selectedInvestmentId]);

  // Handle operation submission
  const handleConfirmOperation = async (params: {
    investmentId: string;
    type: "buy" | "sell";
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    fees: number;
    date: string;
    linkedAccountId?: string;
  }) => {
    const target = investments.find((i) => i.id === params.investmentId);
    if (!target) return;

    let newQty = target.quantity;
    let newTotal = target.currentValue;

    if (params.type === "buy") {
      newQty = Number((target.quantity + params.quantity).toFixed(8));
      newTotal = Number((target.currentValue + params.totalAmount).toFixed(2));
    } else {
      newQty = Math.max(0, Number((target.quantity - params.quantity).toFixed(8)));
      newTotal = Math.max(0, Number((target.currentValue - params.quantity * params.unitPrice).toFixed(2)));
    }

    // Update investment value on server
    await updateInvestmentValue(target.id, newTotal, newQty);

    // If linked to cash account, record ledger movement
    if (params.linkedAccountId) {
      const kind = params.type === "buy" ? "Contribution" : "Disposal";
      try {
        await recordCash(target.id, kind, {
          accountId: params.linkedAccountId,
          amount: String(params.totalAmount),
          description: `${params.type === "buy" ? "Compra" : "Venta"} de ${target.name}`,
          occurredAt: params.date,
        });
        await onCashComplete();
      } catch {
        // Handled in recordCash notification
      }
    }
  };

  // If an investment is selected, render the detailed view
  if (selectedInvestment) {
    return (
      <>
        <InvestmentDetailView
          investment={selectedInvestment}
          allInvestments={investments}
          onBack={() => setSelectedInvestmentId(null)}
          onOpenUpdatePrice={(inv) => setUpdatePriceInvestment(inv)}
          onOpenEditInvestment={(inv) => setEditInvestment(inv)}
          onOpenOperation={(inv, type) => {
            if (type === "cash") {
              setCashInvestment(inv);
            } else {
              setOperationInvestment(inv);
            }
          }}
          currency={currencySymbol}
        />

        {/* Modals available while in detail view */}
        <UpdatePriceModal
          investment={updatePriceInvestment}
          isOpen={!!updatePriceInvestment}
          onClose={() => setUpdatePriceInvestment(null)}
          onUpdateValue={updateInvestmentValue}
          currencySymbol={currencySymbol}
        />

        <RegisterOperationModal
          investment={operationInvestment}
          accounts={accounts}
          isOpen={!!operationInvestment}
          onClose={() => setOperationInvestment(null)}
          onConfirmOperation={handleConfirmOperation}
          currencySymbol={currencySymbol}
        />

        <EditInvestmentModal
          investment={editInvestment}
          isOpen={!!editInvestment}
          onClose={() => setEditInvestment(null)}
          onDelete={async (id) => {
            await deleteInvestment(id);
            setSelectedInvestmentId(null);
          }}
        />

        <InvestmentCashModal
          open={!!cashInvestment}
          onClose={() => setCashInvestment(null)}
          controller={controller}
          accounts={accounts}
          onComplete={onCashComplete}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header with Period Selector & "+ Registrar inversión" */}
      <InvestmentsHeader
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        onOpenCreateInvestment={() => setCreateOpen(true)}
        onOpenCashModal={() => setGeneralCashOpen(true)}
        onSyncBinance={handleSyncBinance}
        isSyncingBinance={isSyncingBinance}
        onSyncLivePrices={async () => {
          const count = await controller.syncLiveCryptoPrices();
          if (count > 0) {
            notify.success(`Se actualizaron ${count} precios en vivo desde Binance Spot.`);
          } else {
            notify.info("Las cotizaciones de tus criptos ya están al día.");
          }
        }}
        isSyncingLivePrices={controller.isSyncingLivePrices}
      />

      {/* 2. Top 4 KPI Cards */}
      <InvestmentsKpiCards metrics={overview} currency={currencySymbol} />

      {/* 3. Middle Section: Evolución, Distribución & Rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Evolución del portafolio */}
        <div className="lg:col-span-5 flex flex-col">
          <PortfolioEvolutionChart
            points={overview.evolutionPoints}
            currentValue={overview.totalValue}
            currency={currencySymbol}
          />
        </div>

        {/* Center: Distribución por tipo de inversión */}
        <div className="lg:col-span-4 flex flex-col">
          <PortfolioDistributionDonutCard
            distribution={overview.categoryDistribution}
            totalValue={overview.totalValue}
            currency={currencySymbol}
          />
        </div>

        {/* Right: Rendimiento por inversión */}
        <div className="md:col-span-2 lg:col-span-3 flex flex-col">
          <InvestmentPerformanceListCard
            items={overview.performanceRanking}
            onSelectInvestment={(id) => setSelectedInvestmentId(id)}
            currency={currencySymbol}
          />
        </div>
      </div>

      {/* 4. Bottom Section: Mis Inversiones Table (8 cols) & Goals/Events (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Mis inversiones Table */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <InvestmentsTableCard
            investments={investments}
            kindCounts={overview.kindCounts}
            totalCount={overview.totalCount}
            onSelectInvestment={(id) => setSelectedInvestmentId(id)}
            onOpenUpdatePrice={(inv) => setUpdatePriceInvestment(inv)}
            onOpenCashModal={(inv) => setCashInvestment(inv)}
            onDeleteInvestment={deleteInvestment}
            currency={currencySymbol}
            formatter={format}
          />
        </div>

        {/* Right Column: Metas de inversión & Próximos eventos */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5">
          <InvestmentGoalsCard
            goals={goals.map((g) => ({
              id: g.id,
              title: g.name,
              currentAmount: g.currentAmount ?? 0,
              targetAmount: g.targetAmount,
              percentage: Math.round(g.percentageAchieved ?? 0),
              color: "#2dd4bf",
            }))}
            onAddGoal={onOpenCreateGoalModal}
            currency={currencySymbol}
          />
          <InvestmentUpcomingEventsCard />
        </div>
      </div>

      {/* Interactive Modals */}
      <CreateInvestmentModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createInvestment}
        currencySymbol={currencySymbol}
      />

      <UpdatePriceModal
        investment={updatePriceInvestment}
        isOpen={!!updatePriceInvestment}
        onClose={() => setUpdatePriceInvestment(null)}
        onUpdateValue={updateInvestmentValue}
        currencySymbol={currencySymbol}
      />

      <RegisterOperationModal
        investment={operationInvestment}
        accounts={accounts}
        isOpen={!!operationInvestment}
        onClose={() => setOperationInvestment(null)}
        onConfirmOperation={handleConfirmOperation}
        currencySymbol={currencySymbol}
      />

      <EditInvestmentModal
        investment={editInvestment}
        isOpen={!!editInvestment}
        onClose={() => setEditInvestment(null)}
        onDelete={deleteInvestment}
      />

      <InvestmentCashModal
        open={generalCashOpen || !!cashInvestment}
        onClose={() => {
          setGeneralCashOpen(false);
          setCashInvestment(null);
        }}
        controller={controller}
        accounts={accounts}
        onComplete={onCashComplete}
      />
    </div>
  );
}
