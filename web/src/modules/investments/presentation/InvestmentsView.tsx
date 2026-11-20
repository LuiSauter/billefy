"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { InvestmentsController } from "../application/useInvestments";
import { Investment, InvestmentTransactionDto, InvestmentPurchaseInput, InvestmentValuationInput } from "../domain/investment.types";
import { calculatePortfolioOverview } from "../domain/portfolio-analytics";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { GoalDto } from "@/modules/planning/domain/planning.types";
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
import { ArchiveInvestmentModal } from "./modals/ArchiveInvestmentModal";
import { InvestmentCashModal } from "./InvestmentCashModal";
import { PurchaseInvestmentModal } from "./modals/PurchaseInvestmentModal";

interface InvestmentsViewProps {
  controller: InvestmentsController;
  p2pRate: number;
  accounts: AccountDto[];
  goals?: GoalDto[];
  onCashComplete: () => Promise<void>;
  onOpenCreateGoalModal?: () => void;
  onOpenBinanceModal?: () => void;
  currency?: "BOB" | "USD";
}

export function InvestmentsView({
  controller,
  p2pRate = 9.85,
  accounts,
  goals = [],
  onCashComplete,
  onOpenCreateGoalModal,
  onOpenBinanceModal,
  currency = "USD",
}: InvestmentsViewProps) {
  const {
    investments,
    createInvestment,
    updateInvestmentValue,
    deleteInvestment,
    recordCash,
  } = controller;

  // Navigation State
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);
  const [selectedInvestmentTransactions, setSelectedInvestmentTransactions] = useState<InvestmentTransactionDto[]>([]);

  // Load transactions when selecting an investment
  useEffect(() => {
    if (!selectedInvestmentId) {
      setSelectedInvestmentTransactions([]);
      return;
    }
    let cancelled = false;
    void controller.getTransactions(selectedInvestmentId).then((txs) => {
      if (!cancelled) {
        setSelectedInvestmentTransactions(txs);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedInvestmentId, controller]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("6m");
  const [isSyncingBinance, setIsSyncingBinance] = useState(false);

  // Modal States
  const [createOpen, setCreateOpen] = useState(false);
  const [cashInvestment, setCashInvestment] = useState<Investment | null>(null);
  const [generalCashOpen, setGeneralCashOpen] = useState(false);
  const [updatePriceInvestment, setUpdatePriceInvestment] = useState<Investment | null>(null);
  const [archiveInvestment, setArchiveInvestment] = useState<Investment | null>(null);
  const [operationInvestment, setOperationInvestment] = useState<Investment | null>(null);
  const [purchaseInvestment, setPurchaseInvestment] = useState<Investment | null>(null);

  const handlePurchase = async (id: string, input: InvestmentPurchaseInput, key: string) => {
    await controller.purchaseInvestment(id, input, key);
    await onCashComplete();
    if (selectedInvestmentId === id) setSelectedInvestmentTransactions(await controller.getTransactions(id));
  };
  const handleValuation = async (id: string, input: InvestmentValuationInput) => {
    await controller.recordValuation(id, input);
    if (selectedInvestmentId === id) setSelectedInvestmentTransactions(await controller.getTransactions(id));
  };

  // Auto-sync market prices once on load if user has crypto or stocks/funds positions
  const hasAutoSynced = useRef(false);
  useEffect(() => {
    if (hasAutoSynced.current || investments.length === 0) return;
    const hasSyncable = investments.some(
      (i) =>
        i.quantity > 0 &&
        (i.kind === "crypto" || ((i.kind === "stocks" || i.kind === "funds") && !!i.ticker))
    );
    if (hasSyncable) {
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
  const targetCurrency: "USD" | "BOB" = currency;
  const overview = useMemo(() => {
    return calculatePortfolioOverview(investments, targetCurrency, p2pRate);
  }, [investments, targetCurrency, p2pRate]);

  const goalItems = useMemo(
    () =>
      goals.map((g) => ({
        id: g.id,
        title: g.name,
        currentAmount: g.currentAmount ?? 0,
        targetAmount: g.targetAmount,
        percentage: Math.round(g.percentageAchieved ?? 0),
        color: "#2dd4bf",
      })),
    [goals]
  );

  // Selected Investment
  const selectedInvestment = useMemo(() => {
    if (!selectedInvestmentId) return null;
    return investments.find((i) => i.id === selectedInvestmentId) || null;
  }, [investments, selectedInvestmentId]);

  // Handle operation submission
  const handleConfirmOperation = async (params: {
    investmentId: string;
    type: "buy" | "sell" | "dividend";
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    fees: number;
    date: string;
    notes?: string;
    linkedAccountId?: string;
    idempotencyKey?: string;
    totalAmountExact?: string;
  }) => {
    // Purchases use the dedicated atomic form, never operation + a second cash-only request.
    if (params.type === "buy") throw new Error("Usa Comprar unidades para registrar una compra con su cuenta de origen.");
    const target = investments.find((i) => i.id === params.investmentId);
    if (!target) return;

    if (params.type === "dividend") {
      if (!params.linkedAccountId || !params.idempotencyKey || !params.totalAmountExact) throw new Error("Elegí una cuenta para acreditar el cobro.");
      await controller.recordDividend(target.id, { totalAmount: params.totalAmountExact,
        linkedAccountId: params.linkedAccountId, occurredAt: params.date, notes: params.notes }, params.idempotencyKey);
      // The write committed: a read failure must not invite another financial submission.
      try {
        await onCashComplete();
        if (selectedInvestmentId === target.id) setSelectedInvestmentTransactions(await controller.getTransactions(target.id));
      } catch (reason) { notify.error("El cobro se guardó. Recarga los datos; no vuelvas a enviarlo.", reason); }
      return;
    }

    const opType = "Sell";

    // 1. Persist immutable operation in backend transaction ledger
    await controller.registerOperation(target.id, {
      type: opType,
      quantity: params.quantity,
      unitPrice: params.unitPrice,
      totalAmount: params.totalAmount,
      fees: params.fees,
      occurredAt: params.date,
      notes: params.notes,
      linkedAccountId: params.linkedAccountId,
    });

    // Refresh transaction list for selected investment
    if (selectedInvestmentId === target.id) {
      const freshTxs = await controller.getTransactions(target.id);
      setSelectedInvestmentTransactions(freshTxs);
    }

    // 2. If linked to cash account, record ledger cash movement
    if (params.linkedAccountId) {
      const cashKind = "Disposal";

      try {
        await recordCash(target.id, cashKind, {
          accountId: params.linkedAccountId,
          amount: String(params.totalAmount),
          description: `Venta de ${target.name}`,
          occurredAt: params.date,
        });
        await onCashComplete();
      } catch {
        // Handled in recordCash notification
      }
    }
  };

  // Modals are shared by the list and the detail view: rendered once, whichever view is active.
  const modals = (
    <>
      <PurchaseInvestmentModal investment={purchaseInvestment} accounts={accounts} isOpen={!!purchaseInvestment}
        onClose={() => setPurchaseInvestment(null)} onPurchase={handlePurchase} />

      <CreateInvestmentModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createInvestment}
        onFetchStockQuote={controller.getStockQuote}
        currency={currency}
      />

      <UpdatePriceModal
        investment={updatePriceInvestment}
        isOpen={!!updatePriceInvestment}
        onClose={() => setUpdatePriceInvestment(null)}
        onUpdateValue={updateInvestmentValue}
        onRecordValuation={handleValuation}
        currency={updatePriceInvestment?.currency ?? currency}
      />

      <RegisterOperationModal
        investment={operationInvestment}
        accounts={accounts}
        isOpen={!!operationInvestment}
        onClose={() => setOperationInvestment(null)}
        onConfirmOperation={handleConfirmOperation}
        initialType="sell"
        onRequestPurchase={() => { setPurchaseInvestment(operationInvestment); setOperationInvestment(null); }}
        onFetchStockQuote={controller.getStockQuote}
        currency={currency}
      />

      <ArchiveInvestmentModal
        investment={archiveInvestment}
        isOpen={!!archiveInvestment}
        onClose={() => setArchiveInvestment(null)}
        currency={currency}
        onDelete={async (id) => {
          await deleteInvestment(id);
          // Archiving the asset being viewed leaves the detail view.
          if (selectedInvestmentId === id) setSelectedInvestmentId(null);
        }}
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
        investmentId={cashInvestment?.id}
      />
    </>
  );

  // If an investment is selected, render the detailed view
  if (selectedInvestment) {
    return (
      <>
        <InvestmentDetailView
          investment={selectedInvestment}
          allInvestments={investments}
          transactions={selectedInvestmentTransactions}
          onBack={() => setSelectedInvestmentId(null)}
          onOpenUpdatePrice={(inv) => setUpdatePriceInvestment(inv)}
          onOpenArchiveInvestment={(inv) => setArchiveInvestment(inv)}
          onOpenOperation={(inv, type) => {
            if (type === "cash") {
              setCashInvestment(inv);
            } else if (type === "buy") {
              setPurchaseInvestment(inv);
            } else {
              setOperationInvestment(inv);
            }
          }}
          currency={selectedInvestment.currency}
        />
        {modals}
      </>
    );
  }

  return (
    <div className="@container flex flex-col gap-6">
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
            notify.success(`Se actualizaron ${count} cotizaciones en vivo (Binance y Yahoo Finance).`);
          } else {
            notify.info("Las cotizaciones de tus activos ya están al día.");
          }
        }}
        isSyncingLivePrices={controller.isSyncingLivePrices}
      />

      {/* 2. Top 4 KPI Cards */}
      <InvestmentsKpiCards metrics={overview} currency={currency} />

      {/* 3. Middle Section: Evolución, Distribución & Rendimiento (sized from the page area, not the viewport) */}
      <div className="grid grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-12 gap-5 items-stretch">
        {/* Left: Evolución del portafolio */}
        <div className="@5xl:col-span-5 flex flex-col min-w-0">
          <PortfolioEvolutionChart
            points={overview.evolutionPoints}
            currentValue={overview.totalValue}
            currency={currency}
          />
        </div>

        {/* Center: Distribución por tipo de inversión */}
        <div className="@5xl:col-span-4 flex flex-col min-w-0">
          <PortfolioDistributionDonutCard
            distribution={overview.categoryDistribution}
            totalValue={overview.totalValue}
            currency={currency}
          />
        </div>

        {/* Right: Rendimiento por inversión */}
        <div className="@2xl:col-span-2 @5xl:col-span-3 flex flex-col min-w-0">
          <InvestmentPerformanceListCard
            items={overview.performanceRanking}
            onSelectInvestment={(id) => setSelectedInvestmentId(id)}
            currency={currency}
            p2pRate={p2pRate}
          />
        </div>
      </div>

      {/* 4. Bottom Section: Mis Inversiones Table & Goals/Events */}
      <div className="grid grid-cols-1 @4xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Mis inversiones Table */}
        <div className="@4xl:col-span-7 @5xl:col-span-8 flex flex-col gap-4 min-w-0">
          <InvestmentsTableCard
            investments={investments}
            kindCounts={overview.kindCounts}
            totalCount={overview.totalCount}
            onSelectInvestment={(id) => setSelectedInvestmentId(id)}
            onOpenUpdatePrice={(inv) => setUpdatePriceInvestment(inv)}
            onOpenCashModal={(inv) => setCashInvestment(inv)}
            onArchiveInvestment={(inv) => setArchiveInvestment(inv)}
            onOpenPurchase={setPurchaseInvestment}
            currency={currency}
            p2pRate={p2pRate}
          />
        </div>

        {/* Right Column: Metas de inversión & Próximos eventos */}
        <div className="@4xl:col-span-5 @5xl:col-span-4 flex flex-col gap-5 min-w-0">
          <InvestmentGoalsCard
            goals={goalItems}
            onAddGoal={onOpenCreateGoalModal}
            currency={currency}
          />
          {/* No upcoming-events data source exists yet: honest empty state, no add handler. */}
          <InvestmentUpcomingEventsCard />
        </div>
      </div>

      {modals}
    </div>
  );
}
