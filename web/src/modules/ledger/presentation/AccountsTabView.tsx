"use client";

import React, { useState, useMemo } from "react";
import { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import {
  calculateAccountsOverview,
  classifyAccountCategory,
} from "@/modules/ledger/domain/accounts-overview";
import { AccountsHeaderStats } from "./AccountsHeaderStats";
import { AccountsFilterToolbar, FilterCategory, ViewMode } from "./AccountsFilterToolbar";
import { AccountsMainView } from "./AccountsMainView";
import { AccountsAnalyticsSidePanels } from "./AccountsAnalyticsSidePanels";
import { AccountDetailView } from "./account-detail/AccountDetailView";
import { EditAccountModal } from "./EditAccountModal";

interface AccountsTabViewProps {
  accounts: AccountDto[];
  transactions?: TransactionDto[];
  p2pRate?: number;
  selectedCurrency?: "BOB" | "USD";
  loading: boolean;
  onOpenCreateAccountModal: () => void;
  onOpenCsvModal: () => void;
  onOpenReconcileModal: (account: AccountDto) => void;
  onUpdateAccount?: (
    accountId: string,
    data: { name: string; iconKey: string; colorKey: string }
  ) => Promise<void>;
  onOpenRegisterTxnModal?: (account: AccountDto) => void;
  onEditTxn?: (txn: TransactionDto) => void;
  onReverseTxn?: (txnId: string) => void;
}

export function AccountsTabView({
  accounts,
  transactions = [],
  p2pRate = 9.85,
  selectedCurrency = "USD",
  loading,
  onOpenCreateAccountModal,
  onOpenCsvModal,
  onOpenReconcileModal,
  onUpdateAccount,
  onOpenRegisterTxnModal,
  onEditTxn,
  onReverseTxn,
}: AccountsTabViewProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountDto | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const metrics = useMemo(() => {
    return calculateAccountsOverview(accounts, transactions, p2pRate);
  }, [accounts, transactions, p2pRate]);

  const filteredAccounts = useMemo(() => {
    if (selectedCategory === "all") return accounts;
    return accounts.filter((a) => classifyAccountCategory(a) === selectedCategory);
  }, [accounts, selectedCategory]);

  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  // If an account is selected, render the detailed account view
  if (selectedAccount) {
    return (
      <>
        <AccountDetailView
          account={selectedAccount}
          transactions={transactions}
          onBack={() => setSelectedAccountId(null)}
          onOpenReconcileModal={onOpenReconcileModal}
          onOpenEditAccountModal={(acc) => setEditingAccount(acc)}
          onOpenRegisterTxnModal={onOpenRegisterTxnModal}
          onEditTxn={onEditTxn}
          onReverseTxn={onReverseTxn}
          p2pRate={p2pRate}
        />

        {editingAccount && (
          <EditAccountModal
            account={editingAccount}
            onClose={() => setEditingAccount(null)}
            onSubmit={onUpdateAccount || (async () => {})}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header with Title, Description, "+ Agregar cuenta" & 6 Stat Cards */}
      <AccountsHeaderStats
        metrics={metrics}
        currency={selectedCurrency}
        onOpenCreateAccountModal={onOpenCreateAccountModal}
        onOpenCsvModal={onOpenCsvModal}
      />

      {/* 2. Filter Tabs & View Mode Switcher */}
      <AccountsFilterToolbar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={accounts.length}
        categoryTotals={metrics.categoryTotals}
      />

      {/* 3. Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Mis Cuentas (Grid or List) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <AccountsMainView
            accounts={filteredAccounts}
            loading={loading}
            viewMode={viewMode}
            onOpenCreateAccountModal={onOpenCreateAccountModal}
            onOpenReconcileModal={onOpenReconcileModal}
            onUpdateAccount={onUpdateAccount}
            onSelectAccount={(acc) => setSelectedAccountId(acc.id)}
          />
        </div>

        {/* Right Column: Distribución Donut & Evolución Area Chart */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
          <AccountsAnalyticsSidePanels
            metrics={metrics}
            accounts={accounts}
            transactions={transactions}
            p2pRate={p2pRate}
            currency={selectedCurrency}
          />
        </div>
      </div>

      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSubmit={onUpdateAccount || (async () => {})}
        />
      )}
    </div>
  );
}
