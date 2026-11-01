"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/modules/identity/application/AuthContext";
import { useDashboardData } from "@/modules/dashboard/application/useDashboardData";
import { useDashboardModals } from "@/modules/dashboard/application/useDashboardModals";
import { useFinancialMetrics } from "@/modules/dashboard/application/useFinancialMetrics";
import { Sidebar, NavigationTab } from "@/modules/dashboard/presentation/Sidebar";
import { Topbar } from "@/modules/dashboard/presentation/Topbar";
import { MobileHeader } from "@/modules/dashboard/presentation/MobileHeader";
import { MobileBottomNav } from "@/modules/dashboard/presentation/MobileBottomNav";
import { DashboardHomeView } from "@/modules/dashboard/presentation/DashboardHomeView";
import { useInvestments } from "@/modules/investments/application/useInvestments";
import { useDistributionPlan } from "@/modules/planning/application/useDistributionPlan";
import { FetchHttpClient } from "@/shared/infrastructure/fetch-http.client";
import { defaultTokenStorage } from "@/shared/infrastructure/local-storage-token.adapter";
import { notify } from "@/shared/lib/notify";
import { Loader2, Wallet } from "lucide-react";

const AuthScreen = dynamic(() =>
  import("@/modules/identity/presentation/AuthScreen").then((m) => m.AuthScreen)
);
const MovimientosView = dynamic(() =>
  import("@/modules/ledger/presentation/MovimientosView").then((m) => m.MovimientosView)
);
const AccountsTabView = dynamic(() =>
  import("@/modules/ledger/presentation/AccountsTabView").then((m) => m.AccountsTabView)
);
const BudgetsTabView = dynamic(() =>
  import("@/modules/planning/presentation/BudgetsTabView").then((m) => m.BudgetsTabView)
);
const LoansList = dynamic(() =>
  import("@/modules/lending/presentation/LoansList").then((m) => m.LoansList)
);
const RecurringPaymentsView = dynamic(() =>
  import("@/modules/planning/presentation/RecurringPaymentsView").then(
    (m) => m.RecurringPaymentsView
  )
);
const ModalsContainer = dynamic(() =>
  import("@/modules/dashboard/presentation/ModalsContainer").then((m) => m.ModalsContainer)
);
const InvestmentsView = dynamic(() =>
  import("@/modules/investments/presentation/InvestmentsView").then((m) => m.InvestmentsView)
);
const DistributionPlanView = dynamic(() =>
  import("@/modules/planning/presentation/DistributionPlanView").then(
    (m) => m.DistributionPlanView
  )
);

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, token, user, logout } = useAuth();
  const dashboard = useDashboardData(token, user?.id);
  const modals = useDashboardModals(dashboard.getLoanById);
  const planningHttp = useMemo(() => {
    const effectiveToken = token || defaultTokenStorage.getAccessToken();
    if (!effectiveToken) return null;
    return new FetchHttpClient({
      authToken: effectiveToken,
      userId: user?.id || defaultTokenStorage.getUser()?.id,
    });
  }, [token, user?.id]);
  const investmentsCtl = useInvestments(planningHttp);
  const planCtl = useDistributionPlan(planningHttp);

  const [activeTab, setActiveTab] = useState<NavigationTab>("inicio");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<"BOB" | "USD">("BOB");

  const p2pRate = dashboard.rate?.appliedRate || 9.85;

  const { balanceMetrics, budgetMetrics } = useFinancialMetrics({
    accounts: dashboard.accounts,
    loans: dashboard.loans,
    budgets: dashboard.budgets,
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
      modals.setIsTxnModalOpen(true);
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
    <div className="h-dvh overflow-hidden bg-background flex font-sans text-foreground">
      <Sidebar
        planEnabled={planCtl.plan.enabled}
        activeTab={activeTab}
        onTabChange={(tab) =>
          tab === "borradores" ? modals.setIsDraftsDrawerOpen(true) : setActiveTab(tab)
        }
        draftsCount={dashboard.pendingDrafts.length}
        p2pRate={p2pRate}
        onOpenFxTransfer={() => modals.setIsFxTransferOpen(true)}
        onOpenWhatsApp={() => modals.setIsWhatsAppModalOpen(true)}
        onOpenBinance={() => modals.setIsBinanceModalOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-y-auto">
        {/* Mobile Header */}
        <MobileHeader
          user={user}
          p2pRate={p2pRate}
          draftsCount={dashboard.pendingDrafts.length}
          onOpenDrafts={() => modals.setIsDraftsDrawerOpen(true)}
          onOpenFx={() => modals.setIsFxTransferOpen(true)}
          onOpenProfile={() => modals.setIsProfileModalOpen(true)}
          onOpenSettings={() => modals.setIsSettingsModalOpen(true)}
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
          onOpenNewTransaction={() => modals.setIsTxnModalOpen(true)}
          onOpenCreateAccount={() => modals.setIsAccountModalOpen(true)}
          onOpenProfile={() => modals.setIsProfileModalOpen(true)}
          onOpenSettings={() => modals.setIsSettingsModalOpen(true)}
          onLogout={logout}
        />

        {dashboard.error && (
          <div className="mx-4 sm:mx-8 mt-4 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold">
            {dashboard.error}
          </div>
        )}

        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-10 flex flex-col gap-6 w-full mx-auto">
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
              onEditTxn={modals.openEditTransaction}
              investments={investmentsCtl.investments}
              onUpdateAccount={dashboard.updateAccount}
              onOpenAccountsTab={() => setActiveTab("cuentas")}
              onOpenInvestmentsTab={() => setActiveTab("inversiones")}
            />
          )}

          {activeTab === "inversiones" && (
            <InvestmentsView controller={investmentsCtl} p2pRate={p2pRate} accounts={dashboard.accounts} onCashComplete={dashboard.refreshLedger} />
          )}

          {activeTab === "plan" && (
            <DistributionPlanView
              controller={planCtl}
              transactions={dashboard.transactions}
              p2pRate={p2pRate}
            />
          )}

          {activeTab === "movimientos" && (
            <MovimientosView
              http={planningHttp}
              accounts={dashboard.accounts}
              onRegister={() => modals.setIsTxnModalOpen(true)}
              onRefresh={dashboard.refreshLedger}
              investmentsController={investmentsCtl}
              selectedCurrency={selectedCurrency}
              p2pRate={p2pRate}
            />
          )}

          {activeTab === "cuentas" && (
            <AccountsTabView
              accounts={dashboard.accounts}
              transactions={dashboard.transactions}
              p2pRate={p2pRate}
              selectedCurrency={selectedCurrency}
              loading={dashboard.loading}
              onOpenCreateAccountModal={() => modals.setIsAccountModalOpen(true)}
              onOpenCsvModal={() => modals.setIsCsvModalOpen(true)}
              onOpenReconcileModal={modals.openReconcile}
              onUpdateAccount={dashboard.updateAccount}
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
              plan={planCtl.plan}
              planStatus={planCtl.loadStatus}
              onRetryPlan={planCtl.reloadPlan}
              budgets={dashboard.budgets}
              budgetsLoading={dashboard.budgetsLoading}
              budgetsError={dashboard.budgetsError}
              onRetryBudgets={() => void dashboard.refreshBudgets()}
              goalsLoading={dashboard.planningOverviewStatus === "loading"}
              overviewError={dashboard.planningOverviewError}
              overviewLoading={dashboard.planningOverviewStatus === "loading" || dashboard.planningOverviewStatus === "refreshing"}
              onRetryOverview={() => void dashboard.retryPlanningOverview()}
              onUpdateBudget={dashboard.updateBudget}
              goals={dashboard.goals}
              health={dashboard.health}
              budgetMetrics={budgetMetrics}
              onOpenCreateBudgetModal={() => modals.setIsBudgetModalOpen(true)}
              onOpenCreateGoalModal={() => modals.setIsGoalModalOpen(true)}
              onOpenAccounts={() => setActiveTab("cuentas")}
            />
          )}

          {activeTab === "recurrentes" && (
            <RecurringPaymentsView
              p2pRate={p2pRate}
              onOpenRescheduleModal={modals.openReschedule}
              onPay1Click={(item) =>
                notify.success(`Pago de ${item.name} confirmado`, `Monto: Bs. ${item.amount} procesado en 1-Clic`)
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
        planEnabled={planCtl.plan.enabled}
      />

      <ModalsContainer
        modals={modals}
        user={user}
        onOpenAccounts={() => setActiveTab("cuentas")}
        accounts={dashboard.accounts}
        pendingDrafts={dashboard.pendingDrafts}
        p2pRate={p2pRate}
        selectedCurrency={selectedCurrency}
        onSelectCurrency={setSelectedCurrency}
        onLogout={logout}
        planEnabled={planCtl.plan.enabled}
        onTogglePlan={(enabled) => {
          const accepted = planCtl.setEnabled(enabled);
          if (enabled && !accepted) {
            modals.setIsSettingsModalOpen(false);
            setActiveTab("plan");
          }
          if (!enabled && activeTab === "plan") setActiveTab("inicio");
        }}
        actions={{
          createAccount: dashboard.createAccount,
          registerTransaction: dashboard.registerTransaction,
          updateTransaction: dashboard.updateTransaction,
          reverseTransaction: dashboard.reverseTransaction,
          executeFxTransfer: dashboard.executeFxTransfer,
          reconcileAccount: dashboard.reconcileAccount,
          simulateLoan: dashboard.simulateLoan,
          createLoan: dashboard.createLoan,
          registerLoanPayment: dashboard.registerLoanPayment,
          cancelLoan: dashboard.cancelLoan,
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
