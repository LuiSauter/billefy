"use client";

import React, { useMemo, useState } from "react";
import { Landmark, PlusCircle } from "lucide-react";
import { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { DraftDto } from "@/modules/ingestion/domain/ingestion.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { Investment } from "@/modules/investments/domain/investment.types";
import { BalanceMetrics } from "@/modules/dashboard/application/useFinancialMetrics";
import { UserDto } from "@/modules/identity/domain/identity.types";
import { usePatrimonio } from "@/modules/patrimonio/application/usePatrimonio";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { calculateDashboardHomeAnalytics } from "../domain/dashboard-home-analytics";
import { DashboardWelcomeHeader } from "./home/DashboardWelcomeHeader";
import { DashboardHeroKpiCards } from "./home/DashboardHeroKpiCards";
import { DashboardAccountsCard } from "./home/DashboardAccountsCard";
import { DashboardCashFlowCard } from "./home/DashboardCashFlowCard";
import { DashboardCategoryExpensesCard } from "./home/DashboardCategoryExpensesCard";
import { DashboardDistributionCard } from "./home/DashboardDistributionCard";
import { DashboardAssetsCard } from "./home/DashboardAssetsCard";
import { DashboardNetWorthEvolutionCard } from "./home/DashboardNetWorthEvolutionCard";
import { DashboardTopInvestmentsCard } from "./home/DashboardTopInvestmentsCard";
import { DashboardInsightsCard } from "./home/DashboardInsightsCard";
import { DraftsInbox } from "@/modules/ingestion/presentation/DraftsInbox";

export interface DashboardHomeViewProps {
  user?: UserDto | null;
  metrics: BalanceMetrics;
  accounts: AccountDto[];
  accountsMap: Map<string, AccountDto>;
  drafts: DraftDto[];
  transactions: TransactionDto[];
  loans: LoanSummaryDto[];
  loading: boolean;
  p2pRate: number;
  selectedCurrency?: "BOB" | "USD";
  onToggleCurrency?: () => void;
  onOpenFx?: () => void;
  onOpenNewTxn?: () => void;
  onOpenLending?: () => void;
  onOpenDrafts?: () => void;
  onOpenCreateAccountModal: () => void;
  onOpenReconcileModal: (account: AccountDto) => void;
  onConfirmDraft: (draft: DraftDto, selectedAccountId: string) => void;
  onDiscardDraft: (draftId: string) => void;
  onConfirmAllDrafts: () => void;
  onReverseTxn: (txnId: string) => void;
  onEditTxn?: (txn: TransactionDto) => void;
  investments?: Investment[];
  onOpenAccountsTab?: () => void;
  onOpenInvestmentsTab?: () => void;
  onOpenPlanTab?: () => void;
  onOpenPatrimonioTab?: () => void;
  onOpenSettings?: () => void;
  onUpdateAccount?: (
    accountId: string,
    data: { name: string; iconKey: string; colorKey: string }
  ) => Promise<void>;
}

export function DashboardHomeView({
  user,
  accounts,
  drafts,
  transactions,
  loans,
  loading,
  p2pRate,
  selectedCurrency = "BOB",
  onOpenCreateAccountModal,
  onConfirmDraft,
  onDiscardDraft,
  onConfirmAllDrafts,
  investments = [],
  onOpenAccountsTab,
  onOpenInvestmentsTab,
  onOpenPlanTab,
  onOpenPatrimonioTab,
  onOpenSettings,
}: DashboardHomeViewProps) {
  void loading;
  const hasAccounts = accounts.length > 0;
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const { manualAssets, manualLiabilities } = usePatrimonio();
  const { categories } = useUserCategories();

  const categoryNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categories]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const analytics = useMemo(() => {
    return calculateDashboardHomeAnalytics({
      accounts,
      transactions,
      loans,
      investments,
      manualAssets,
      manualLiabilities,
      categoryNamesMap,
      selectedCurrency,
      p2pRate,
      year,
      month,
    });
  }, [
    accounts,
    transactions,
    loans,
    investments,
    manualAssets,
    manualLiabilities,
    categoryNamesMap,
    selectedCurrency,
    p2pRate,
    year,
    month,
  ]);

  const handleSelectMonth = (newYear: number, newMonth: number) => {
    setCurrentDate(new Date(newYear, newMonth, 1));
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Welcome Header (Greeting + Month selector + Bell + Settings) */}
      <DashboardWelcomeHeader
        user={user}
        currentDate={currentDate}
        onSelectMonth={handleSelectMonth}
        onOpenSettings={onOpenSettings}
      />

      {/* Onboarding Banner when 0 accounts */}
      {!hasAccounts && (
        <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-card border border-primary/30 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
              <Landmark className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-extrabold text-foreground">
                ¡Te damos la bienvenida a Billefy! Vincula tu primera cuenta
              </h3>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">
                Para empezar a registrar movimientos, transferencias FX y presupuestos, vincula tu cuenta bancaria o billetera digital.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenCreateAccountModal}
            className="h-9 px-4 rounded-xl bg-primary hover:bg-blue-600 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Vincular Cuenta</span>
          </button>
        </div>
      )}

      {/* 2. Top 4 Hero KPI Cards (Patrimonio Neto, Activos, Pasivos, Saldo total) */}
      <DashboardHeroKpiCards
        kpis={analytics.kpis}
        selectedCurrency={selectedCurrency}
      />

      {/* Optional Drafts Banner if user has pending captures */}
      {drafts.length > 0 && (
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4">
          <DraftsInbox
            drafts={drafts}
            accounts={accounts}
            onConfirmDraft={onConfirmDraft}
            onDiscardDraft={onDiscardDraft}
            onConfirmAll={onConfirmAllDrafts}
          />
        </div>
      )}

      {/* 3. Middle Section: 3 Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Column 1: Mis cuentas */}
        <div className="flex flex-col h-full">
          <DashboardAccountsCard
            accounts={accounts}
            selectedCurrency={selectedCurrency}
            onOpenCreateAccount={onOpenCreateAccountModal}
            onOpenAccountsTab={onOpenAccountsTab}
          />
        </div>

        {/* Column 2: Flujo del mes & Gastos por categoría */}
        <div className="flex flex-col gap-5 h-full">
          <div className="flex-1">
            <DashboardCashFlowCard
              cashFlow={analytics.monthlyCashFlow}
              selectedCurrency={selectedCurrency}
            />
          </div>
          <div className="flex-1">
            <DashboardCategoryExpensesCard
              categories={analytics.categoryExpenses}
              totalExpenses={analytics.totalExpensesInCategories}
              selectedCurrency={selectedCurrency}
            />
          </div>
        </div>

        {/* Column 3: Distribución recomendada (50/30/20) & Mis activos */}
        <div className="flex flex-col gap-5 h-full">
          <div className="flex-1">
            <DashboardDistributionCard
              distribution={analytics.recommendedDistribution}
              selectedCurrency={selectedCurrency}
            />
          </div>
          <div className="flex-1">
            <DashboardAssetsCard
              assets={analytics.assetsSummary}
              selectedCurrency={selectedCurrency}
              onOpenPatrimonio={onOpenPatrimonioTab}
            />
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: 3 Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Column 1: Evolución del patrimonio neto */}
        <div className="flex flex-col h-full">
          <DashboardNetWorthEvolutionCard
            data={analytics.netWorthEvolution}
            selectedCurrency={selectedCurrency}
          />
        </div>

        {/* Column 2: Principales inversiones */}
        <div className="flex flex-col h-full">
          <DashboardTopInvestmentsCard
            investments={analytics.topInvestments}
            selectedCurrency={selectedCurrency}
            onOpenInvestmentsTab={onOpenInvestmentsTab}
          />
        </div>

        {/* Column 3: Insights y recomendaciones */}
        <div className="flex flex-col h-full">
          <DashboardInsightsCard
            insights={analytics.insights}
            onOpenPlan={onOpenPlanTab}
          />
        </div>
      </div>
    </div>
  );
}
