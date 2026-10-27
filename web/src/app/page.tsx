"use client";

import { useState, useMemo } from "react";
import { useDashboardData } from "@/application/hooks/useDashboardData";
import { useDashboardModals } from "@/application/hooks/useDashboardModals";
import { useFinancialMetrics } from "@/application/hooks/useFinancialMetrics";
import { Sidebar, NavigationTab } from "@/presentation/components/navigation/Sidebar";
import { Topbar } from "@/presentation/components/navigation/Topbar";
import { AuthScreen } from "@/presentation/components/auth/AuthScreen";
import { DashboardHomeView } from "@/presentation/views/DashboardHomeView";
import { AccountsTabView } from "@/presentation/views/AccountsTabView";
import { BudgetsTabView } from "@/presentation/views/BudgetsTabView";
import { LoansList } from "@/presentation/components/lending/LoansList";
import { RecurringPaymentsView } from "@/presentation/components/recurring/RecurringPaymentsView";
import { ModalsContainer } from "@/presentation/modals/ModalsContainer";

export default function DashboardPage() {
  const dashboard = useDashboardData();
  const modals = useDashboardModals(dashboard.getLoanById);

  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeTab, setActiveTab] = useState<NavigationTab>("inicio");
  const [searchQuery, setSearchQuery] = useState("");

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

  if (!isAuthenticated) {
    return <AuthScreen onLogin={() => setIsAuthenticated(true)} p2pRate={p2pRate} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) =>
          tab === "borradores" ? modals.setIsDraftsDrawerOpen(true) : setActiveTab(tab)
        }
        draftsCount={dashboard.pendingDrafts.length}
        p2pRate={p2pRate}
        onLogout={() => setIsAuthenticated(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenFxTransfer={() => modals.setIsFxTransferOpen(true)}
          onOpenNewTransaction={() => modals.setIsTxnModalOpen(true)}
          onOpenWhatsApp={() => modals.setIsWhatsAppModalOpen(true)}
          onOpenBinance={() => modals.setIsBinanceModalOpen(true)}
        />

        {dashboard.error && (
          <div className="mx-6 lg:mx-8 mt-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
            {dashboard.error}
          </div>
        )}

        <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
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
              onOpenContributeModal={() => modals.setIsTxnModalOpen(true)}
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
