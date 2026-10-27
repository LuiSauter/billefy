"use client";

import React from "react";
import { AccountDto, DraftDto, TransactionDto, LoanSummaryDto } from "@/domain/models/types";
import { BalanceMetrics } from "@/application/hooks/useFinancialMetrics";
import { BalanceSummaryCards } from "@/presentation/components/dashboard/BalanceSummaryCards";
import { AccountsList } from "@/presentation/components/accounts/AccountsList";
import { DraftsInbox } from "@/presentation/components/drafts/DraftsInbox";
import { TransactionsList } from "@/presentation/components/transactions/TransactionsList";

interface DashboardHomeViewProps {
  metrics: BalanceMetrics;
  accounts: AccountDto[];
  accountsMap: Map<string, AccountDto>;
  drafts: DraftDto[];
  transactions: TransactionDto[];
  loans: LoanSummaryDto[];
  loading: boolean;
  p2pRate: number;
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
  onOpenCreateAccountModal,
  onOpenReconcileModal,
  onConfirmDraft,
  onDiscardDraft,
  onConfirmAllDrafts,
  onReverseTxn,
}: DashboardHomeViewProps) {
  return (
    <div className="space-y-6">
      {/* 4 KPI Summary Cards */}
      <BalanceSummaryCards metrics={metrics} p2pRate={p2pRate} />

      {/* Middle Grid: Accounts (Left) & Drafts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Bottom Section: Actividad Reciente & Auditoría de Tasas P2P */}
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
