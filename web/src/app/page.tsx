"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
import { Loader2, Wallet } from "lucide-react";
import type { WorkspaceSubtab } from "@/modules/workspaces/presentation/WorkspaceDashboardView";
import { WorkspacesApiRepository } from "@/modules/workspaces/infrastructure/workspaces-api.repository";

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
const DeudasView = dynamic(() =>
  import("@/modules/lending/presentation/deudas/DeudasView").then((m) => m.DeudasView)
);
const DineroPrestadoView = dynamic(() =>
  import("@/modules/lending/presentation/prestado/DineroPrestadoView").then((m) => m.DineroPrestadoView)
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
const PatrimonioView = dynamic(() =>
  import("@/modules/patrimonio/presentation/PatrimonioView").then((m) => m.PatrimonioView)
);
const ReportsView = dynamic(() =>
  import("@/modules/reports/presentation/ReportsView").then((m) => m.ReportsView)
);
const SharedWorkspacesHubView = dynamic(() =>
  import("@/modules/workspaces/presentation/SharedWorkspacesHubView").then(
    (m) => m.SharedWorkspacesHubView
  )
);
const WorkspaceShell = dynamic(() =>
  import("@/modules/workspaces/presentation/WorkspaceShell").then((m) => m.WorkspaceShell)
);
const SettingsView = dynamic(() =>
  import("@/modules/identity/presentation/SettingsView").then(
    (m) => m.SettingsView
  )
);
const GoalsTabView = dynamic(() =>
  import("@/modules/planning/presentation/GoalsTabView").then(
    (m) => m.GoalsTabView
  )
);
const CalendarioView = dynamic(() =>
  import("@/modules/planning/presentation/calendar/CalendarioView").then(
    (m) => m.CalendarioView
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
  const [workspaceSelection, setWorkspaceSelection] = useState<{ id: string; tab: WorkspaceSubtab } | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<"BOB" | "USD">("BOB");
  const workspaceQueryHandled = useRef(false);

  useEffect(() => {
    if (workspaceQueryHandled.current || !isAuthenticated || !planningHttp || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const workspaceId = url.searchParams.get("workspace");
    if (workspaceId === null) return;
    workspaceQueryHandled.current = true;
    url.searchParams.delete("workspace");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId) || !user?.id) return;
    void new WorkspacesApiRepository(planningHttp).getWorkspaces().then((workspaces) => {
      if (!workspaces.some((workspace) => workspace.id === workspaceId)) return;
      setWorkspaceSelection({ id: workspaceId, tab: "dashboard" });
      setActiveTab("compartido");
    }).catch(() => undefined);
  }, [isAuthenticated, planningHttp, user?.id]);

  useEffect(() => {
    if (user?.preferredCurrency === "USD" || user?.preferredCurrency === "BOB") {
      setSelectedCurrency(user.preferredCurrency);
    }
  }, [user?.preferredCurrency]);

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
          onOpenSettings={() => setActiveTab("configuracion")}
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
          onOpenSettings={() => setActiveTab("configuracion")}
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
              user={user}
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
              onOpenPlanTab={() => setActiveTab("presupuestos")}
              onOpenPatrimonioTab={() => setActiveTab("patrimonio")}
              onOpenSettings={() => setActiveTab("configuracion")}
            />
          )}

          {activeTab === "inversiones" && (
            <InvestmentsView
              controller={investmentsCtl}
              p2pRate={p2pRate}
              accounts={dashboard.accounts}
              goals={dashboard.goals}
              currencySymbol={selectedCurrency === "BOB" ? "Bs." : "$"}
              onCashComplete={dashboard.refreshLedger}
              onOpenCreateGoalModal={() => modals.setIsGoalModalOpen(true)}
              onOpenBinanceModal={() => modals.setIsBinanceModalOpen(true)}
            />
          )}

          {activeTab === "patrimonio" && (
            <PatrimonioView
              investments={investmentsCtl.investments}
              accounts={dashboard.accounts}
              loans={dashboard.loans}
              transactions={dashboard.transactions}
              onNavigateToInvestments={() => setActiveTab("inversiones")}
              selectedCurrency={selectedCurrency}
              currencySymbol={selectedCurrency === "BOB" ? "Bs." : "$"}
              onToggleCurrency={() =>
                setSelectedCurrency((prev) => (prev === "BOB" ? "USD" : "BOB"))
              }
              p2pRate={p2pRate}
            />
          )}

          {activeTab === "reportes" && (
            <ReportsView
              transactions={dashboard.transactions}
              accounts={dashboard.accounts}
              loans={dashboard.loans}
              budgets={dashboard.budgets}
              selectedCurrency={selectedCurrency}
              p2pRate={p2pRate}
              loading={dashboard.loading}
              onNavigateToTab={(tab) => setActiveTab(tab as NavigationTab)}
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
              onExecuteFxTransfer={dashboard.executeFxTransfer}
              onEditTxn={modals.openEditTransaction}
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
              onDeleteAccount={dashboard.deleteAccount}
              onOpenRegisterTxnModal={() => modals.setIsTxnModalOpen(true)}
              onEditTxn={modals.openEditTransaction}
              onReverseTxn={dashboard.reverseTransaction}
            />
          )}

          {(activeTab === "deudas" || activeTab === "prestamos") && (
            <DeudasView
              loans={dashboard.loans}
              loading={dashboard.loading}
              selectedCurrency={selectedCurrency}
              p2pRate={p2pRate}
              onOpenCreateDebt={() => modals.setIsCreateDebtModalOpen(true)}
              onOpenPayment={(loanId) => modals.openLoanPayment(loanId, dashboard.loans)}
              onOpenLoanDetails={modals.openLoanDetail}
            />
          )}

          {activeTab === "prestado" && (
            <DineroPrestadoView
              loans={dashboard.loans}
              loading={dashboard.loading}
              selectedCurrency={selectedCurrency}
              p2pRate={p2pRate}
              onOpenCreateLent={() => modals.setIsCreateLentModalOpen(true)}
              onOpenPayment={(loanId) => modals.openLoanPayment(loanId, dashboard.loans)}
              onOpenLoanDetails={modals.openLoanDetail}
            />
          )}

          {activeTab === "plan" && (
            <BudgetsTabView
              plan={planCtl.plan}
              planController={planCtl}
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
              transactions={dashboard.transactions}
              p2pRate={p2pRate}
              selectedCurrency={selectedCurrency}
              onOpenCreateBudgetModal={() => modals.setIsBudgetModalOpen(true)}
              onOpenCreateGoalModal={() => modals.setIsGoalModalOpen(true)}
              onOpenAccounts={() => setActiveTab("cuentas")}
            />
          )}

          {activeTab === "presupuestos" && (
            <BudgetsTabView
              plan={planCtl.plan}
              planController={planCtl}
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
              transactions={dashboard.transactions}
              p2pRate={p2pRate}
              selectedCurrency={selectedCurrency}
              onOpenCreateBudgetModal={() => modals.setIsBudgetModalOpen(true)}
              onOpenCreateGoalModal={() => modals.setIsGoalModalOpen(true)}
              onOpenAccounts={() => setActiveTab("cuentas")}
            />
          )}

          {activeTab === "metas" && (
            <GoalsTabView
              goals={dashboard.goals}
              accounts={dashboard.accounts}
              loading={dashboard.planningOverviewStatus === "loading"}
              error={dashboard.planningOverviewError}
              onRetry={() => void dashboard.retryPlanningOverview()}
              onOpenCreateGoalModal={() => modals.setIsGoalModalOpen(true)}
              onOpenAccounts={() => setActiveTab("cuentas")}
              onOpenPlan={() => setActiveTab("presupuestos")}
              onUpdateGoal={dashboard.updateGoal}
              onDeleteGoal={dashboard.deleteGoal}
              selectedCurrency={selectedCurrency}
              p2pRate={p2pRate}
            />
          )}

          {activeTab === "calendario" && (
            <CalendarioView
              repository={dashboard.planningRepo}
              accounts={dashboard.accounts}
              loans={dashboard.loans}
              transactions={dashboard.transactions}
              selectedCurrency={selectedCurrency}
              p2pRate={p2pRate}
              onFinancialDataChange={dashboard.refreshFinancialData}
            />
          )}

          {activeTab === "recurrentes" && (
            <RecurringPaymentsView
              repository={dashboard.planningRepo}
              accounts={dashboard.accounts}
              selectedCurrency={selectedCurrency}
              p2pRate={p2pRate}
              onFinancialDataChange={dashboard.refreshFinancialData}
            />
          )}

          {activeTab === "compartido" && (
            workspaceSelection ? <WorkspaceShell
              key={`${user?.id}-${workspaceSelection.id}`}
              http={planningHttp}
              workspaceId={workspaceSelection.id}
              initialTab={workspaceSelection.tab}
              onBack={() => setWorkspaceSelection(null)}
            /> : <SharedWorkspacesHubView
              http={planningHttp}
              userId={user?.id}
              onOpenWorkspace={(id, tab) => setWorkspaceSelection({ id, tab })}
              onOpenPersonal={() => { setWorkspaceSelection(null); setActiveTab("inicio"); }}
            />
          )}

          {activeTab === "configuracion" && (
            <SettingsView
              user={user}
              selectedCurrency={selectedCurrency}
              onSelectCurrency={setSelectedCurrency}
              p2pRate={p2pRate}
              onOpenBinance={() => modals.setIsBinanceModalOpen(true)}
              onOpenCsv={() => modals.setIsCsvModalOpen(true)}
              onOpenWhatsApp={() => modals.setIsWhatsAppModalOpen(true)}
              onOpenFxTransfer={() => modals.setIsFxTransferOpen(true)}
              onLogout={logout}
              onFinancialDataReset={dashboard.refreshFinancialData}
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
        onOpenSettings={() => setActiveTab("configuracion")}
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
