"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Landmark, PlusCircle } from "lucide-react";
import { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { DraftDto } from "@/modules/ingestion/domain/ingestion.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { BalanceMetrics } from "@/modules/dashboard/application/useFinancialMetrics";
import { BalanceSummaryCards } from "@/modules/ledger/presentation/BalanceSummaryCards";
import { AccountsList } from "@/modules/ledger/presentation/AccountsList";
import { DraftsInbox } from "@/modules/ingestion/presentation/DraftsInbox";
import { TransactionsList } from "@/modules/ledger/presentation/TransactionsList";
import { MobileWalletCard } from "@/modules/ledger/presentation/MobileWalletCard";
import { AccountsSummaryCard } from "@/modules/ledger/presentation/AccountsSummaryCard";
import { CategoryDistributionCard } from "@/modules/ledger/presentation/CategoryDistributionCard";
import { InvestmentsSummaryCard } from "@/modules/investments/presentation/InvestmentsSummaryCard";
import { Investment } from "@/modules/investments/domain/investment.types";

const CashFlowAreaChart = dynamic(
  () =>
    import("@/modules/ledger/presentation/CashFlowAreaChart").then(
      (m) => m.CashFlowAreaChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] rounded-[16px] bg-card border border-border animate-pulse" />
    ),
  }
);

const CurrencyDonutChart = dynamic(
  () =>
    import("@/modules/fx/presentation/CurrencyDonutChart").then(
      (m) => m.CurrencyDonutChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] rounded-[16px] bg-card border border-border animate-pulse" />
    ),
  }
);

interface DashboardHomeViewProps {
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
  onUpdateAccount?: (
    accountId: string,
    data: { name: string; iconKey: string; colorKey: string }
  ) => Promise<void>;
}

export function DashboardHomeView({
  metrics,
  accounts,
  accountsMap,
  drafts,
  transactions,
  loading,
  p2pRate,
  selectedCurrency = "BOB",
  onToggleCurrency = () => {},
  onOpenFx = () => {},
  onOpenNewTxn = () => {},
  onOpenLending = () => {},
  onOpenDrafts = () => {},
  onOpenCreateAccountModal,
  onOpenReconcileModal,
  onConfirmDraft,
  onDiscardDraft,
  onConfirmAllDrafts,
  onReverseTxn,
  onEditTxn,
  investments = [],
  onOpenAccountsTab,
  onOpenInvestmentsTab,
  onUpdateAccount,
}: DashboardHomeViewProps) {
  const hasAccounts = accounts.length > 0;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* Mobile-Only Wallet Card & Actions (OpenPencil Mobile n2160) */}
      <MobileWalletCard
        metrics={metrics}
        p2pRate={p2pRate}
        accounts={accounts}
        draftsCount={drafts.length}
        selectedCurrency={selectedCurrency}
        onToggleCurrency={onToggleCurrency}
        onOpenFx={onOpenFx}
        onOpenNewTxn={onOpenNewTxn}
        onOpenLending={onOpenLending}
        onOpenDrafts={onOpenDrafts}
        onOpenCreateAccount={onOpenCreateAccountModal}
      />

      {/* Desktop Onboarding Banner when 0 Accounts */}
      {!hasAccounts && (
        <div className="hidden md:flex items-center justify-between p-5 rounded-[18px] bg-linear-to-r from-blue-950/60 via-indigo-950/40 to-card border border-primary/30 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[14px] bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
              <Landmark className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-[15px] font-extrabold text-foreground">
                ¡Te damos la bienvenida a Billefy! Configurá tu primera cuenta
              </h3>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">
                Para empezar a registrar movimientos, transferencias FX y presupuestos, primero vinculá tu cuenta bancaria o billetera digital.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenCreateAccountModal}
            className="h-[42px] px-5 rounded-[12px] bg-primary hover:bg-blue-600 active:scale-[0.99] text-white text-sm font-extrabold transition flex items-center gap-2 shadow-2xs shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Vincular Primera Cuenta</span>
          </button>
        </div>
      )}

      {/* Desktop-Only 4 KPI Summary Cards (OpenPencil KPIs) */}
      <div className="hidden md:block">
        <BalanceSummaryCards
          metrics={metrics}
          p2pRate={p2pRate}
          selectedCurrency={selectedCurrency}
          hasAccounts={hasAccounts}
        />
      </div>

      {/* Charts section: CashFlow Area + Currency Donut */}
      {hasAccounts && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1.1fr] gap-4 items-start">
          <CashFlowAreaChart
            transactions={transactions}
            currencySymbol={selectedCurrency === "BOB" ? "Bs." : "$"}
          />
          <CurrencyDonutChart accounts={accounts} p2pRate={p2pRate} />
        </div>
      )}

      {hasAccounts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <AccountsSummaryCard
            accounts={accounts}
            transactions={transactions}
            onOpenAccounts={onOpenAccountsTab}
          />
          <InvestmentsSummaryCard
            investments={investments}
            p2pRate={p2pRate}
            onOpenInvestments={onOpenInvestmentsTab ?? (() => {})}
          />
          <CategoryDistributionCard
            direction="Income"
            transactions={transactions}
            p2pRate={p2pRate}
          />
          <CategoryDistributionCard
            direction="Expense"
            transactions={transactions}
            p2pRate={p2pRate}
          />
        </div>
      )}

      {/* Middle Grid: Accounts (Left) & Drafts (Right) (OpenPencil Grid2) */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        <AccountsList
          accounts={accounts}
          loading={loading}
          onOpenCreateAccountModal={onOpenCreateAccountModal}
          onOpenReconcileModal={onOpenReconcileModal}
          onUpdateAccount={onUpdateAccount}
        />

        <DraftsInbox
          drafts={drafts}
          accounts={accounts}
          onConfirmDraft={onConfirmDraft}
          onDiscardDraft={onDiscardDraft}
          onConfirmAll={onConfirmAllDrafts}
        />
      </div>

      {/* Bottom Section: Actividad Reciente & Auditoría de Tasas P2P (OpenPencil Table) */}
      <TransactionsList
        transactions={transactions}
        accountsMap={accountsMap}
        loading={loading}
        onReverseTxn={onReverseTxn}
        onEditTxn={onEditTxn}
        onOpenNewTxn={onOpenNewTxn}
        p2pRate={p2pRate}
      />
    </div>
  );
}
