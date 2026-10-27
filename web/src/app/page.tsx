"use client";

import { useState } from "react";
import { useDashboardData } from "@/application/hooks/useDashboardData";
import { Sidebar, NavigationTab } from "@/presentation/components/navigation/Sidebar";
import { Topbar } from "@/presentation/components/navigation/Topbar";
import { AuthScreen } from "@/presentation/components/auth/AuthScreen";
import { BalanceSummaryCards } from "@/presentation/components/dashboard/BalanceSummaryCards";
import { HealthIndicatorsCard } from "@/presentation/components/dashboard/HealthIndicatorsCard";
import { AccountsList } from "@/presentation/components/accounts/AccountsList";
import { DraftsInbox } from "@/presentation/components/drafts/DraftsInbox";
import { TransactionsList } from "@/presentation/components/transactions/TransactionsList";
import { MonthlyBudgetView } from "@/presentation/components/planning/MonthlyBudgetView";
import { FinancialGoalsView } from "@/presentation/components/planning/FinancialGoalsView";
import { RecurringPaymentsView, RecurringItem } from "@/presentation/components/recurring/RecurringPaymentsView";
import { LoansList } from "@/presentation/components/lending/LoansList";

// Modals
import { FxTransferModal } from "@/presentation/components/modals/FxTransferModal";
import { DraftsDrawerModal } from "@/presentation/components/modals/DraftsDrawerModal";
import { ReschedulePaymentModal } from "@/presentation/components/modals/ReschedulePaymentModal";
import { CreateAccountModal } from "@/presentation/components/modals/CreateAccountModal";
import { RegisterTransactionModal } from "@/presentation/components/modals/RegisterTransactionModal";
import { ReconcileModal } from "@/presentation/components/modals/ReconcileModal";
import { CreateLoanModal } from "@/presentation/components/modals/CreateLoanModal";
import { LoanDetailModal } from "@/presentation/components/modals/LoanDetailModal";
import { LoanPaymentModal } from "@/presentation/components/modals/LoanPaymentModal";
import { CreateBudgetModal } from "@/presentation/components/modals/CreateBudgetModal";
import { CreateGoalModal } from "@/presentation/components/modals/CreateGoalModal";
import { WhatsAppModal } from "@/presentation/components/modals/WhatsAppModal";
import { BinanceModal } from "@/presentation/components/modals/BinanceModal";
import { IncomeDistributionModal } from "@/presentation/components/modals/IncomeDistributionModal";
import { CsvImportModal } from "@/presentation/components/modals/CsvImportModal";
import { SimulateNotificationModal } from "@/presentation/components/modals/SimulateNotificationModal";
import { AccountDto, LoanDetailDto } from "@/domain/models/types";

export default function DashboardPage() {
  const {
    accounts,
    accountsMap,
    transactions,
    pendingDrafts,
    loans,
    budgets,
    goals,
    health,
    rate,
    totals,
    loading,
    error,
    createAccount,
    registerTransaction,
    reverseTransaction,
    confirmDraft,
    discardDraft,
    reconcileAccount,
    importStatementCsv,
    simulateLoan,
    createLoan,
    getLoanById,
    registerLoanPayment,
    createBudget,
    createGoal,
    linkWhatsApp,
    sendWhatsAppWebhook,
    connectBinance,
    syncBinance,
    proposeIncomeDistribution,
    simulateRawEvent,
  } = useDashboardData();

  // Navigation & Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeTab, setActiveTab] = useState<NavigationTab>("inicio");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals visibility state
  const [isFxTransferModalOpen, setIsFxTransferModalOpen] = useState(false);
  const [isDraftsDrawerOpen, setIsDraftsDrawerOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedRecurringItem, setSelectedRecurringItem] = useState<RecurringItem | null>(null);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isLoanPaymentModalOpen, setIsLoanPaymentModalOpen] = useState(false);
  const [isLoanDetailModalOpen, setIsLoanDetailModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isBinanceModalOpen, setIsBinanceModalOpen] = useState(false);
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);

  // Selected entities for modals
  const [reconcileAccountTarget, setReconcileAccountTarget] = useState<AccountDto | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [selectedLoanDetail, setSelectedLoanDetail] = useState<LoanDetailDto | null>(null);

  const p2pRate = rate?.appliedRate || 9.85;

  // Handlers
  const handleOpenLoanDetail = async (loanId: string) => {
    try {
      const detail = await getLoanById(loanId);
      setSelectedLoanDetail(detail);
      setIsLoanDetailModalOpen(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al cargar detalle");
    }
  };

  const handleOpenLoanPayment = (loanId: string) => {
    setSelectedLoanId(loanId);
    setIsLoanPaymentModalOpen(true);
  };

  const handleOpenReconcile = (account: AccountDto) => {
    setReconcileAccountTarget(account);
    setIsReconcileModalOpen(true);
  };

  const handleConfirmAllDrafts = async () => {
    for (const draft of pendingDrafts) {
      const accId =
        draft.suggestedAccountId ||
        accounts.find((a) => a.currency === draft.currency)?.id ||
        accounts[0]?.id ||
        "";
      if (accId) {
        await confirmDraft(draft.id, {
          accountId: accId,
          description: draft.reference ? `Ref: ${draft.reference}` : "Captura 1-Tap",
        });
      }
    }
  };

  // If not authenticated, show OpenPencil 01 Auth screen
  if (!isAuthenticated) {
    return (
      <AuthScreen
        onLogin={() => setIsAuthenticated(true)}
        p2pRate={p2pRate}
      />
    );
  }

  // Filtered transactions for search
  const filteredTransactions = transactions.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const account = accountsMap.get(t.accountId);
    return (
      (t.description || "").toLowerCase().includes(q) ||
      (account?.name || "").toLowerCase().includes(q) ||
      t.currency.toLowerCase().includes(q) ||
      t.amount.toString().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* 1. Sidebar Navigation (OpenPencil 02) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === "borradores") {
            setIsDraftsDrawerOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        draftsCount={pendingDrafts.length}
        p2pRate={p2pRate}
        onLogout={() => setIsAuthenticated(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 2. Topbar Header */}
        <Topbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenFxTransfer={() => setIsFxTransferModalOpen(true)}
          onOpenNewTransaction={() => setIsTxnModalOpen(true)}
          onOpenWhatsApp={() => setIsWhatsAppModalOpen(true)}
          onOpenBinance={() => setIsBinanceModalOpen(true)}
        />

        {/* Global Error Banner */}
        {error && (
          <div className="mx-6 lg:mx-8 mt-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Dynamic View Body */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* TAB: INICIO (OpenPencil 02 Master Dashboard) */}
          {activeTab === "inicio" && (
            <>
              {/* Top 4 KPI Summary Cards */}
              <BalanceSummaryCards
                bobTotal={totals.bobTotal}
                usdTotal={totals.usdTotal}
                consolidatedUsd={totals.consolidatedUsd}
                accounts={accounts}
                loans={loans}
                p2pRate={p2pRate}
              />

              {/* Middle Section: Accounts (Left) & Drafts (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AccountsList
                  accounts={accounts}
                  loading={loading}
                  onOpenCreateAccountModal={() => setIsAccountModalOpen(true)}
                  onOpenReconcileModal={handleOpenReconcile}
                />

                <DraftsInbox
                  drafts={pendingDrafts}
                  accounts={accounts}
                  onConfirmDraft={(draft, accountId) =>
                    confirmDraft(draft.id, {
                      accountId,
                      description: draft.reference ? `Ref: ${draft.reference}` : "Captura 1-Tap",
                    })
                  }
                  onDiscardDraft={discardDraft}
                  onConfirmAll={handleConfirmAllDrafts}
                />
              </div>

              {/* Bottom Section: Actividad Reciente & Auditoría de Tasas P2P */}
              <TransactionsList
                transactions={filteredTransactions}
                accountsMap={accountsMap}
                loading={loading}
                onReverseTxn={reverseTransaction}
                p2pRate={p2pRate}
              />
            </>
          )}

          {/* TAB: MIS CUENTAS */}
          {activeTab === "cuentas" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    Mis Cuentas & Billeteras
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Conciliación bancaria y saldos en vivo multimoneda
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCsvModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    📄 Importar Extracto CSV
                  </button>
                  <button
                    onClick={() => setIsAccountModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-md shadow-blue-500/25"
                  >
                    + Nueva Cuenta
                  </button>
                </div>
              </div>

              <AccountsList
                accounts={accounts}
                loading={loading}
                onOpenCreateAccountModal={() => setIsAccountModalOpen(true)}
                onOpenReconcileModal={handleOpenReconcile}
              />
            </div>
          )}

          {/* TAB: PRÉSTAMOS (Lending Engine) */}
          {activeTab === "prestamos" && (
            <div className="space-y-6">
              <LoansList
                loans={loans}
                loading={loading}
                onOpenCreateLoanModal={() => setIsLoanModalOpen(true)}
                onOpenLoanDetails={handleOpenLoanDetail}
                onOpenPaymentModal={handleOpenLoanPayment}
              />
            </div>
          )}

          {/* TAB: PRESUPUESTOS (OpenPencil 05 & 06) */}
          {activeTab === "presupuestos" && (
            <div className="space-y-8">
              <MonthlyBudgetView
                budgets={budgets}
                onOpenCreateBudgetModal={() => setIsBudgetModalOpen(true)}
              />

              <FinancialGoalsView
                goals={goals}
                health={health}
                onOpenCreateGoalModal={() => setIsGoalModalOpen(true)}
                onOpenContributeModal={() => setIsTxnModalOpen(true)}
                p2pRate={p2pRate}
              />

              <HealthIndicatorsCard health={health} />
            </div>
          )}

          {/* TAB: RECURRENTES / ARBITRAJE P2P (OpenPencil 09) */}
          {activeTab === "recurrentes" && (
            <div className="space-y-6">
              <RecurringPaymentsView
                p2pRate={p2pRate}
                onOpenRescheduleModal={(item) => {
                  setSelectedRecurringItem(item);
                  setIsRescheduleModalOpen(true);
                }}
                onPay1Click={(item) => {
                  alert(`Pago de ${item.name} por Bs. ${item.amount} procesado en 1-Clic`);
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* 3. OpenPencil Design Modals & Drawers */}
      <FxTransferModal
        isOpen={isFxTransferModalOpen}
        onClose={() => setIsFxTransferModalOpen(false)}
        accounts={accounts}
        p2pRate={p2pRate}
        onConfirmTransfer={async (data) => {
          await registerTransaction({
            accountId: data.fromAccountId,
            amount: data.amount.toString(),
            direction: "Expense",
            description: data.description,
          });
        }}
      />

      <DraftsDrawerModal
        isOpen={isDraftsDrawerOpen}
        onClose={() => setIsDraftsDrawerOpen(false)}
        drafts={pendingDrafts}
        accounts={accounts}
        onConfirmDraft={(draft, accountId) =>
          confirmDraft(draft.id, {
            accountId,
            description: draft.reference ? `Ref: ${draft.reference}` : "Captura 1-Tap",
          })
        }
        onConfirmAll={handleConfirmAllDrafts}
      />

      <ReschedulePaymentModal
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setSelectedRecurringItem(null);
        }}
        item={selectedRecurringItem}
        onConfirmPay={(item) => {
          alert(`Pago de ${item.name} por Bs. ${item.amount} confirmado en 1-Clic`);
        }}
        onSaveNewDate={(item, newDate) => {
          alert(`Fecha de vencimiento de ${item.name} actualizada para ${newDate}`);
        }}
      />

      {/* Remaining Feature Modals */}
      <CreateAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSubmit={createAccount}
      />

      <RegisterTransactionModal
        isOpen={isTxnModalOpen}
        accounts={accounts}
        defaultAccountId={accounts[0]?.id || ""}
        onClose={() => setIsTxnModalOpen(false)}
        onSubmit={registerTransaction}
      />

      <ReconcileModal
        isOpen={isReconcileModalOpen}
        account={reconcileAccountTarget}
        onClose={() => setIsReconcileModalOpen(false)}
        onSubmit={reconcileAccount}
      />

      <CreateLoanModal
        isOpen={isLoanModalOpen}
        accounts={accounts}
        onClose={() => setIsLoanModalOpen(false)}
        onSimulate={simulateLoan}
        onSubmit={createLoan}
      />

      <LoanDetailModal
        isOpen={isLoanDetailModalOpen}
        loan={selectedLoanDetail}
        onClose={() => setIsLoanDetailModalOpen(false)}
      />

      <LoanPaymentModal
        isOpen={isLoanPaymentModalOpen}
        accounts={accounts}
        onClose={() => setIsLoanPaymentModalOpen(false)}
        onSubmit={async (req) => {
          await registerLoanPayment(selectedLoanId, req);
        }}
      />

      <CreateBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onSubmit={createBudget}
      />

      <CreateGoalModal
        isOpen={isGoalModalOpen}
        accounts={accounts}
        onClose={() => setIsGoalModalOpen(false)}
        onSubmit={createGoal}
        p2pRate={p2pRate}
      />

      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onLinkPhone={linkWhatsApp}
        onSendMessage={(msg) => sendWhatsAppWebhook("+591 700 00000", msg)}
      />

      <BinanceModal
        isOpen={isBinanceModalOpen}
        accounts={accounts}
        onClose={() => setIsBinanceModalOpen(false)}
        onConnect={connectBinance}
        onSync={syncBinance}
      />

      <IncomeDistributionModal
        isOpen={isDistributeModalOpen}
        onClose={() => setIsDistributeModalOpen(false)}
        onCalculate={proposeIncomeDistribution}
      />

      <CsvImportModal
        isOpen={isCsvModalOpen}
        accounts={accounts}
        onClose={() => setIsCsvModalOpen(false)}
        onSubmit={importStatementCsv}
      />

      <SimulateNotificationModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        onSubmit={simulateRawEvent}
      />
    </div>
  );
}
