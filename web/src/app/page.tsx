"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/presentation/context/AuthContext";
import { useDashboardData } from "@/application/hooks/useDashboardData";
import { useDashboardModals } from "@/application/hooks/useDashboardModals";
import { useFinancialMetrics } from "@/application/hooks/useFinancialMetrics";
import { Sidebar, NavigationTab } from "@/presentation/components/navigation/Sidebar";
import { Topbar } from "@/presentation/components/navigation/Topbar";
import { MobileHeader } from "@/presentation/components/navigation/MobileHeader";
import { MobileBottomNav } from "@/presentation/components/navigation/MobileBottomNav";
import { AuthScreen } from "@/presentation/components/auth/AuthScreen";
import { DashboardHomeView } from "@/presentation/views/DashboardHomeView";
import { AccountsTabView } from "@/presentation/views/AccountsTabView";
import { BudgetsTabView } from "@/presentation/views/BudgetsTabView";
import { LoansList } from "@/presentation/components/lending/LoansList";
import { RecurringPaymentsView } from "@/presentation/components/recurring/RecurringPaymentsView";
import { ModalsContainer } from "@/presentation/modals/ModalsContainer";
import { Loader2, Wallet } from "lucide-react";

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, token, user, logout } = useAuth();
  const dashboard = useDashboardData(token, user?.id);
  const modals = useDashboardModals(dashboard.getLoanById);

  const [activeTab, setActiveTab] = useState<NavigationTab>("inicio");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<"BOB" | "USD">("BOB");

  const p2pRate = dashboard.rate?.appliedRate || 9.85;

  const { balanceMetrics, budgetMetrics, totalSavedBob } = useFinancialMetrics({
    accounts: dashboard.accounts,
    loans: dashboard.loans,
    budgets: dashboard.budgets,
    goals: dashboard.goals,
    bobTotal: dashboard.totals.bobTotal,
    usdTotal: dashboard.totals.usdTotal,
    consolidatedUsd: dashboard.totals.consolidatedUsd,
    p2pRate,
  });

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return dashboard.transactions;
    const q = searchQuery.toLowerCase();
    return dashboard.transactions.filter((t) => {
      const account = dashboard.accountsMap.get(t.accountId);
      return (
        (t.description || "").toLowerCase().includes(q) ||
        (account?.name || "").toLowerCase().includes(q) ||
        t.currency.toLowerCase().includes(q) ||
        t.amount.toString().includes(q)
      );
    });
  }, [dashboard.transactions, dashboard.accountsMap, searchQuery]);

  const handleConfirmAllDrafts = async () => {
    for (const draft of dashboard.pendingDrafts) {
      const accId =
        draft.suggestedAccountId ||
        dashboard.accounts.find((a) => a.currency === draft.currency)?.id ||
        dashboard.accounts[0]?.id ||
        "";
      if (accId) {
        await dashboard.confirmDraft(draft.id, {
          accountId: accId,
          description: draft.reference ? `Ref: ${draft.reference}` : "Captura 1-Tap",
        });
      }
    }
  };

  const handleOpenQuickTxn = () => {
    if (dashboard.accounts.length === 0) {
      modals.setIsAccountModalOpen(true);
    } else {
      modals.setIsMobile1TapTxnOpen(true);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 rounded-[14px] bg-slate-800 flex items-center justify-center text-white shadow-lg">
          <Wallet className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Verificando sesión segura...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen p2pRate={p2pRate} />;
  }

  return (
    <div className="min-h-screen bg-background flex font-sans text-foreground">
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) =>
          tab === "borradores" ? modals.setIsDraftsDrawerOpen(true) : setActiveTab(tab)
        }
        draftsCount={dashboard.pendingDrafts.length}
        p2pRate={p2pRate}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header (OpenPencil Mobile n2160 Island + UBar) */}
        <MobileHeader
          user={user}
          p2pRate={p2pRate}
          draftsCount={dashboard.pendingDrafts.length}
          selectedCurrency={selectedCurrency}
          onToggleCurrency={() =>
            setSelectedCurrency((prev) => (prev === "BOB" ? "USD" : "BOB"))
          }
          onOpenDrafts={() => modals.setIsDraftsDrawerOpen(true)}
          onOpenFx={() => modals.setIsFxTransferOpen(true)}
          onLogout={logout}
        />

        {/* Desktop Topbar (OpenPencil Web Topbar) */}
        <Topbar
          user={user}
          accountsCount={dashboard.accounts.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCurrency={selectedCurrency}
          onToggleCurrency={() =>
            setSelectedCurrency((prev) => (prev === "BOB" ? "USD" : "BOB"))
          }
          onOpenFxTransfer={() => modals.setIsFxTransferOpen(true)}
          onOpenNewTransaction={() => modals.setIsTxnModalOpen(true)}
          onOpenCreateAccount={() => modals.setIsAccountModalOpen(true)}
          onOpenWhatsApp={() => modals.setIsWhatsAppModalOpen(true)}
          onOpenBinance={() => modals.setIsBinanceModalOpen(true)}
        />

        {dashboard.error && (
          <div className="mx-4 sm:mx-8 mt-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
            {dashboard.error}
          </div>
        )}

        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-10 flex flex-col gap-6 max-w-[1240px] w-full mx-auto">
          {activeTab === "inicio" && (
            <DashboardHomeView
              metrics={balanceMetrics}
              accounts={dashboard.accounts}
              accountsMap={dashboard.accountsMap}
              drafts={dashboard.pendingDrafts}
              transactions={filteredTransactions}
              loans={dashboard.loans}
              loading={dashboard.loading}
              p2pRate={p2pRate}
              selectedCurrency={selectedCurrency}
              onToggleCurrency={() =>
                setSelectedCurrency((prev) => (prev === "BOB" ? "USD" : "BOB"))
              }
              onOpenFx={() => modals.setIsFxTransferOpen(true)}
              onOpenNewTxn={handleOpenQuickTxn}
              onOpenLending={() => setActiveTab("prestamos")}
              onOpenDrafts={() => modals.setIsDraftsDrawerOpen(true)}
              onOpenCreateAccountModal={() => modals.setIsAccountModalOpen(true)}
              onOpenReconcileModal={modals.openReconcile}
              onConfirmDraft={(draft, accountId) =>
                dashboard.confirmDraft(draft.id, {
                  accountId,
                  description: draft.reference ? `Ref: ${draft.reference}` : "Captura 1-Tap",
                })
              }
              onDiscardDraft={dashboard.discardDraft}
              onConfirmAllDrafts={handleConfirmAllDrafts}
              onReverseTxn={dashboard.reverseTransaction}
            />
          )}

          {activeTab === "cuentas" && (
            <AccountsTabView
              accounts={dashboard.accounts}
              loading={dashboard.loading}
              onOpenCreateAccountModal={() => modals.setIsAccountModalOpen(true)}
              onOpenCsvModal={() => modals.setIsCsvModalOpen(true)}
              onOpenReconcileModal={modals.openReconcile}
            />
          )}

          {activeTab === "prestamos" && (
            <LoansList
              loans={dashboard.loans}
              loading={dashboard.loading}
              onOpenCreateLoanModal={() => modals.setIsLoanModalOpen(true)}
              onOpenLoanDetails={modals.openLoanDetail}
              onOpenPaymentModal={modals.openLoanPayment}
            />
          )}

          {activeTab === "presupuestos" && (
            <BudgetsTabView
              budgets={dashboard.budgets}
              goals={dashboard.goals}
              health={dashboard.health}
              budgetMetrics={budgetMetrics}
              totalSavedBob={totalSavedBob}
              p2pRate={p2pRate}
              onOpenCreateBudgetModal={() => modals.setIsBudgetModalOpen(true)}
              onOpenCreateGoalModal={() => modals.setIsGoalModalOpen(true)}
              onOpenContributeModal={() => {
                if (dashboard.accounts.length === 0) {
                  modals.setIsAccountModalOpen(true);
                } else {
                  modals.setIsTxnModalOpen(true);
                }
              }}
            />
          )}

          {activeTab === "recurrentes" && (
            <RecurringPaymentsView
              p2pRate={p2pRate}
              onOpenRescheduleModal={modals.openReschedule}
              onPay1Click={(item) =>
                alert(`Pago de ${item.name} por Bs. ${item.amount} procesado en 1-Clic`)
              }
            />
          )}
        </main>
      </div>

      {/* Fixed Mobile Bottom Navigation Dock */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={(tab) =>
          tab === "borradores" ? modals.setIsDraftsDrawerOpen(true) : setActiveTab(tab)
        }
        onOpenQuickTxn={handleOpenQuickTxn}
      />

      <ModalsContainer
        modals={modals}
        accounts={dashboard.accounts}
        pendingDrafts={dashboard.pendingDrafts}
        p2pRate={p2pRate}
        actions={{
          createAccount: dashboard.createAccount,
          registerTransaction: dashboard.registerTransaction,
          reconcileAccount: dashboard.reconcileAccount,
          simulateLoan: dashboard.simulateLoan,
          createLoan: dashboard.createLoan,
          registerLoanPayment: dashboard.registerLoanPayment,
          createBudget: dashboard.createBudget,
          createGoal: dashboard.createGoal,
          linkWhatsApp: dashboard.linkWhatsApp,
          sendWhatsAppWebhook: dashboard.sendWhatsAppWebhook,
          connectBinance: dashboard.connectBinance,
          syncBinance: dashboard.syncBinance,
          proposeIncomeDistribution: dashboard.proposeIncomeDistribution,
          importStatementCsv: dashboard.importStatementCsv,
          simulateRawEvent: dashboard.simulateRawEvent,
          confirmDraft: dashboard.confirmDraft,
          confirmAllDrafts: handleConfirmAllDrafts,
        }}
      />
    </div>
  );
}
