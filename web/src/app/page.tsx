"use client";

import { useState } from "react";
import { useDashboardData } from "@/application/hooks/useDashboardData";
import { Header } from "@/presentation/components/dashboard/Header";
import { BalanceSummaryCards } from "@/presentation/components/dashboard/BalanceSummaryCards";
import { HealthIndicatorsCard } from "@/presentation/components/dashboard/HealthIndicatorsCard";
import { ActionToolbar } from "@/presentation/components/dashboard/ActionToolbar";
import { DraftsInbox } from "@/presentation/components/drafts/DraftsInbox";
import { BudgetsAndGoalsSection } from "@/presentation/components/planning/BudgetsAndGoalsSection";
import { LoansList } from "@/presentation/components/lending/LoansList";
import { AccountsList } from "@/presentation/components/accounts/AccountsList";
import { TransactionsList } from "@/presentation/components/transactions/TransactionsList";

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

  // Modals visibility state
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

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
      {/* 1. Header with Parallel FX Rate */}
      <Header rate={rate} />

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 2. Consolidated Balance Summary Cards */}
      <BalanceSummaryCards
        bobTotal={totals.bobTotal}
        usdTotal={totals.usdTotal}
        consolidatedUsd={totals.consolidatedUsd}
      />

      {/* 3. Financial Health Indicators */}
      <HealthIndicatorsCard health={health} />

      {/* 4. Action Toolbar */}
      <ActionToolbar
        hasAccounts={accounts.length > 0}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onOpenTxnModal={() => setIsTxnModalOpen(true)}
        onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
        onOpenBinanceModal={() => setIsBinanceModalOpen(true)}
        onOpenDistributeModal={() => setIsDistributeModalOpen(true)}
        onOpenLoanModal={() => setIsLoanModalOpen(true)}
        onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
        onOpenGoalModal={() => setIsGoalModalOpen(true)}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
        onOpenSimulateModal={() => setIsSimulateModalOpen(true)}
      />

      {/* 5. Smart Capture Drafts Inbox */}
      <DraftsInbox
        drafts={pendingDrafts}
        accounts={accounts}
        onConfirmDraft={(draft, accountId) =>
          confirmDraft(draft.id, {
            accountId,
            description: draft.reference ? `Ref: ${draft.reference}` : "Captura confirmada",
          })
        }
        onDiscardDraft={discardDraft}
      />

      {/* 6. Budgets & Goals */}
      <BudgetsAndGoalsSection budgets={budgets} goals={goals} />

      {/* 7. Lending Section (Loans and Debts) */}
      <LoansList
        loans={loans}
        loading={loading}
        onOpenCreateLoanModal={() => setIsLoanModalOpen(true)}
        onOpenLoanDetails={handleOpenLoanDetail}
        onOpenPaymentModal={handleOpenLoanPayment}
      />

      {/* 8. Accounts List */}
      <AccountsList
        accounts={accounts}
        loading={loading}
        onOpenReconcileModal={handleOpenReconcile}
      />

      {/* 9. Transactions List */}
      <TransactionsList
        transactions={transactions}
        accountsMap={accountsMap}
        loading={loading}
        onReverseTxn={reverseTransaction}
      />

      {/* Feature Modals */}
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
