"use client";

import React from "react";
import { Landmark, PlusCircle } from "lucide-react";
import { AccountDto, DraftDto, TransactionDto, LoanSummaryDto } from "@/domain/models/types";
import { BalanceMetrics } from "@/application/hooks/useFinancialMetrics";
import { BalanceSummaryCards } from "@/presentation/components/dashboard/BalanceSummaryCards";
import { AccountsList } from "@/presentation/components/accounts/AccountsList";
import { DraftsInbox } from "@/presentation/components/drafts/DraftsInbox";
import { TransactionsList } from "@/presentation/components/transactions/TransactionsList";
import { MobileWalletCard } from "@/presentation/components/dashboard/MobileWalletCard";

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
        <div className="hidden md:flex items-center justify-between p-5 rounded-[18px] bg-linear-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 shadow-2xs">
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
            className="h-[42px] px-5 rounded-[12px] bg-primary hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-extrabold transition flex items-center gap-2 shadow-2xs shrink-0"
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

      {/* Middle Grid: Accounts (Left) & Drafts (Right) (OpenPencil Grid2) */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        <AccountsList
          accounts={accounts}
          loading={loading}
          onOpenCreateAccountModal={onOpenCreateAccountModal}
          onOpenReconcileModal={onOpenReconcileModal}
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
        p2pRate={p2pRate}
      />
    </div>
  );
}
