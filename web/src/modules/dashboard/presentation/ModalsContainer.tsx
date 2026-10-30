"use client";

import React from "react";
import dynamic from "next/dynamic";
import {
  AccountDto,
  CreateAccountRequest,
  RegisterTransactionRequest,
  UpdateTransactionRequest,
} from "@/modules/ledger/domain/ledger.types";
import {
  ConnectBinanceKeyRequest,
  ConnectBinanceKeyResponse,
  DraftDto,
  ImportStatementCsvRequest,
  StatementImportResult,
} from "@/modules/ingestion/domain/ingestion.types";
import {
  CreateLoanRequest,
  LoanScheduleDto,
  RegisterLoanPaymentRequest,
  SimulateLoanRequest,
} from "@/modules/lending/domain/lending.types";
import {
  CreateBudgetRequest,
  CreateGoalRequest,
  IncomeDistributionProposal,
  ProposeIncomeDistributionRequest,
} from "@/modules/planning/domain/planning.types";
import { LinkWhatsAppResponse } from "@/modules/messaging/domain/messaging.types";
import { UserDto } from "@/modules/identity/domain/identity.types";
import { DashboardModalsController } from "@/modules/dashboard/application/useDashboardModals";
import { notify } from "@/shared/lib/notify";

const FxTransferModal = dynamic(() =>
  import("@/modules/ledger/presentation/FxTransferModal").then((m) => m.FxTransferModal)
);
const DraftsDrawerModal = dynamic(() =>
  import("@/modules/ingestion/presentation/DraftsDrawerModal").then((m) => m.DraftsDrawerModal)
);
const ReschedulePaymentModal = dynamic(() =>
  import("@/modules/planning/presentation/ReschedulePaymentModal").then(
    (m) => m.ReschedulePaymentModal
  )
);
const CreateAccountModal = dynamic(() =>
  import("@/modules/ledger/presentation/CreateAccountModal").then((m) => m.CreateAccountModal)
);
const RegisterTransactionModal = dynamic(() =>
  import("@/modules/ledger/presentation/RegisterTransactionModal").then(
    (m) => m.RegisterTransactionModal
  )
);
const EditTransactionModal = dynamic(() =>
  import("@/modules/ledger/presentation/EditTransactionModal").then(
    (m) => m.EditTransactionModal
  )
);
const ReconcileModal = dynamic(() =>
  import("@/modules/ledger/presentation/ReconcileModal").then((m) => m.ReconcileModal)
);
const CreateLoanModal = dynamic(() =>
  import("@/modules/lending/presentation/CreateLoanModal").then((m) => m.CreateLoanModal)
);
const LoanDetailModal = dynamic(() =>
  import("@/modules/lending/presentation/LoanDetailModal").then((m) => m.LoanDetailModal)
);
const LoanPaymentModal = dynamic(() =>
  import("@/modules/lending/presentation/LoanPaymentModal").then((m) => m.LoanPaymentModal)
);
const CreateBudgetModal = dynamic(() =>
  import("@/modules/planning/presentation/CreateBudgetModal").then((m) => m.CreateBudgetModal)
);
const CreateGoalModal = dynamic(() =>
  import("@/modules/planning/presentation/CreateGoalModal").then((m) => m.CreateGoalModal)
);
const WhatsAppModal = dynamic(() =>
  import("@/modules/messaging/presentation/WhatsAppModal").then((m) => m.WhatsAppModal)
);
const BinanceModal = dynamic(() =>
  import("@/modules/ingestion/presentation/BinanceModal").then((m) => m.BinanceModal)
);
const IncomeDistributionModal = dynamic(() =>
  import("@/modules/planning/presentation/IncomeDistributionModal").then(
    (m) => m.IncomeDistributionModal
  )
);
const CsvImportModal = dynamic(() =>
  import("@/modules/ingestion/presentation/CsvImportModal").then((m) => m.CsvImportModal)
);
const SimulateNotificationModal = dynamic(() =>
  import("@/modules/ingestion/presentation/SimulateNotificationModal").then(
    (m) => m.SimulateNotificationModal
  )
);
const Mobile1TapTransactionModal = dynamic(() =>
  import("@/modules/ledger/presentation/Mobile1TapTransactionModal").then(
    (m) => m.Mobile1TapTransactionModal
  )
);
const UserProfileModal = dynamic(() =>
  import("@/modules/identity/presentation/UserProfileModal").then((m) => m.UserProfileModal)
);
const SettingsModal = dynamic(() =>
  import("@/modules/identity/presentation/SettingsModal").then((m) => m.SettingsModal)
);

interface ModalsContainerProps {
  modals: DashboardModalsController;
  user?: UserDto | null;
  accounts: AccountDto[];
  pendingDrafts: DraftDto[];
  p2pRate: number;
  selectedCurrency: "BOB" | "USD";
  onSelectCurrency: (currency: "BOB" | "USD") => void;
  onLogout?: () => void;
  planEnabled?: boolean;
  onTogglePlan?: (enabled: boolean) => void;
  actions: {
    createAccount: (req: CreateAccountRequest) => Promise<void>;
    registerTransaction: (req: RegisterTransactionRequest) => Promise<void>;
    updateTransaction: (
      transactionId: string,
      req: UpdateTransactionRequest
    ) => Promise<void>;
    reverseTransaction: (transactionId: string) => Promise<void>;
    executeFxTransfer?: (cmd: {
      fromAccountId: string;
      toAccountId: string;
      amount: number | string;
      description: string;
      p2pRate: number;
    }) => Promise<void>;
    reconcileAccount: (accountId: string, realBalance: number, notes?: string) => Promise<void>;
    simulateLoan: (req: SimulateLoanRequest) => Promise<LoanScheduleDto>;
    createLoan: (req: CreateLoanRequest) => Promise<void>;
    registerLoanPayment: (loanId: string, req: RegisterLoanPaymentRequest) => Promise<unknown>;
    createBudget: (req: CreateBudgetRequest) => Promise<void>;
    createGoal: (req: CreateGoalRequest) => Promise<void>;
    linkWhatsApp: (phone: string) => Promise<LinkWhatsAppResponse>;
    sendWhatsAppWebhook: (phone: string, msg: string) => Promise<string | undefined>;
    connectBinance: (req: ConnectBinanceKeyRequest) => Promise<ConnectBinanceKeyResponse>;
    syncBinance: (accountId: string) => Promise<void>;
    proposeIncomeDistribution: (
      req: ProposeIncomeDistributionRequest
    ) => Promise<IncomeDistributionProposal>;
    importStatementCsv: (req: ImportStatementCsvRequest) => Promise<StatementImportResult>;
    simulateRawEvent: (text: string) => Promise<void>;
    confirmDraft: (
      draftId: string,
      data: { accountId: string; description: string }
    ) => Promise<void>;
    confirmAllDrafts: () => Promise<void>;
  };
}

export function ModalsContainer({
  modals,
  user,
  accounts,
  pendingDrafts,
  p2pRate,
  selectedCurrency,
  onSelectCurrency,
  onLogout,
  planEnabled,
  onTogglePlan,
  actions,
}: ModalsContainerProps) {
  const handleOpenCreateAccount = () => modals.setIsAccountModalOpen(true);

  return (
    <>
      {modals.isFxTransferOpen && (
        <FxTransferModal
          isOpen={modals.isFxTransferOpen}
          onClose={() => modals.setIsFxTransferOpen(false)}
          accounts={accounts}
          p2pRate={p2pRate}
          onConfirmTransfer={async (data) => {
            if (actions.executeFxTransfer) {
              await actions.executeFxTransfer({ ...data, p2pRate });
            } else {
              await actions.registerTransaction({
                accountId: data.fromAccountId,
                amount: data.amount.toString(),
                direction: "Expense",
                description: data.description,
              });
            }
          }}
          onOpenCreateAccount={handleOpenCreateAccount}
        />
      )}

      {modals.isDraftsDrawerOpen && (
        <DraftsDrawerModal
          isOpen={modals.isDraftsDrawerOpen}
          onClose={() => modals.setIsDraftsDrawerOpen(false)}
          drafts={pendingDrafts}
          accounts={accounts}
          onConfirmDraft={(draft, accountId) =>
            actions.confirmDraft(draft.id, {
              accountId,
              description: draft.reference ? `Ref: ${draft.reference}` : "Captura 1-Tap",
            })
          }
          onConfirmAll={actions.confirmAllDrafts}
        />
      )}

      {modals.isRescheduleModalOpen && (
        <ReschedulePaymentModal
          isOpen={modals.isRescheduleModalOpen}
          onClose={() => modals.setIsRescheduleModalOpen(false)}
          item={modals.selectedRecurringItem}
          onConfirmPay={(item) => {
            notify.success(
              "Pago confirmado",
              `Pago de ${item.name} por Bs. ${item.amount} confirmado en 1-Clic`
            );
          }}
          onSaveNewDate={(item, newDate) => {
            notify.success(
              "Fecha reprogramada",
              `Fecha de vencimiento de ${item.name} actualizada para ${newDate}`
            );
          }}
        />
      )}

      {modals.isAccountModalOpen && (
        <CreateAccountModal
          isOpen={modals.isAccountModalOpen}
          onClose={() => modals.setIsAccountModalOpen(false)}
          onSubmit={actions.createAccount}
        />
      )}

      {modals.isTxnModalOpen && (
        <RegisterTransactionModal
          isOpen={modals.isTxnModalOpen}
          accounts={accounts}
          defaultAccountId={accounts[0]?.id || ""}
          p2pRate={p2pRate}
          onClose={() => modals.setIsTxnModalOpen(false)}
          onSubmit={actions.registerTransaction}
          onOpenCreateAccount={handleOpenCreateAccount}
        />
      )}

      {modals.isEditTxnModalOpen && (
        <EditTransactionModal
          isOpen={modals.isEditTxnModalOpen}
          transaction={modals.editingTransaction}
          accounts={accounts}
          p2pRate={p2pRate}
          onClose={() => modals.setIsEditTxnModalOpen(false)}
          onUpdate={actions.updateTransaction}
          onDelete={actions.reverseTransaction}
        />
      )}

      {modals.isReconcileModalOpen && (
        <ReconcileModal
          isOpen={modals.isReconcileModalOpen}
          account={modals.reconcileAccountTarget}
          onClose={() => modals.setIsReconcileModalOpen(false)}
          onSubmit={actions.reconcileAccount}
        />
      )}

      {modals.isLoanModalOpen && (
        <CreateLoanModal
          isOpen={modals.isLoanModalOpen}
          accounts={accounts}
          onClose={() => modals.setIsLoanModalOpen(false)}
          onSimulate={actions.simulateLoan}
          onSubmit={actions.createLoan}
        />
      )}

      {modals.isLoanDetailModalOpen && (
        <LoanDetailModal
          isOpen={modals.isLoanDetailModalOpen}
          loan={modals.selectedLoanDetail}
          onClose={() => modals.setIsLoanDetailModalOpen(false)}
        />
      )}

      {modals.isLoanPaymentModalOpen && (
        <LoanPaymentModal
          isOpen={modals.isLoanPaymentModalOpen}
          accounts={accounts}
          onClose={() => modals.setIsLoanPaymentModalOpen(false)}
          onSubmit={async (req) => {
            await actions.registerLoanPayment(modals.selectedLoanId, req);
          }}
        />
      )}

      {modals.isBudgetModalOpen && (
        <CreateBudgetModal
          isOpen={modals.isBudgetModalOpen}
          onClose={() => modals.setIsBudgetModalOpen(false)}
          onSubmit={actions.createBudget}
        />
      )}

      {modals.isGoalModalOpen && (
        <CreateGoalModal
          isOpen={modals.isGoalModalOpen}
          accounts={accounts}
          onClose={() => modals.setIsGoalModalOpen(false)}
          onSubmit={actions.createGoal}
          p2pRate={p2pRate}
        />
      )}

      {modals.isWhatsAppModalOpen && (
        <WhatsAppModal
          isOpen={modals.isWhatsAppModalOpen}
          onClose={() => modals.setIsWhatsAppModalOpen(false)}
          onLinkPhone={actions.linkWhatsApp}
          onSendMessage={(msg) => actions.sendWhatsAppWebhook("+591 70000000", msg)}
        />
      )}

      {modals.isBinanceModalOpen && (
        <BinanceModal
          isOpen={modals.isBinanceModalOpen}
          accounts={accounts}
          onClose={() => modals.setIsBinanceModalOpen(false)}
          onConnect={actions.connectBinance}
          onSync={actions.syncBinance}
        />
      )}

      {modals.isDistributeModalOpen && (
        <IncomeDistributionModal
          isOpen={modals.isDistributeModalOpen}
          onClose={() => modals.setIsDistributeModalOpen(false)}
          onCalculate={actions.proposeIncomeDistribution}
        />
      )}

      {modals.isCsvModalOpen && (
        <CsvImportModal
          isOpen={modals.isCsvModalOpen}
          accounts={accounts}
          onClose={() => modals.setIsCsvModalOpen(false)}
          onSubmit={actions.importStatementCsv}
          onOpenCreateAccount={handleOpenCreateAccount}
        />
      )}

      {modals.isSimulateModalOpen && (
        <SimulateNotificationModal
          isOpen={modals.isSimulateModalOpen}
          onClose={() => modals.setIsSimulateModalOpen(false)}
          onSubmit={actions.simulateRawEvent}
        />
      )}

      {modals.isMobile1TapTxnOpen && (
        <Mobile1TapTransactionModal
          isOpen={modals.isMobile1TapTxnOpen}
          onClose={() => modals.setIsMobile1TapTxnOpen(false)}
          accounts={accounts}
          p2pRate={p2pRate}
          onRegister={actions.registerTransaction}
          onOpenCreateAccount={handleOpenCreateAccount}
        />
      )}

      {modals.isProfileModalOpen && (
        <UserProfileModal
          isOpen={modals.isProfileModalOpen}
          onClose={() => modals.setIsProfileModalOpen(false)}
          user={user}
          accountsCount={accounts.length}
          p2pRate={p2pRate}
          onOpenSettings={() => modals.setIsSettingsModalOpen(true)}
          onLogout={onLogout}
        />
      )}

      {modals.isSettingsModalOpen && (
        <SettingsModal
          isOpen={modals.isSettingsModalOpen}
          onClose={() => modals.setIsSettingsModalOpen(false)}
          selectedCurrency={selectedCurrency}
          onSelectCurrency={onSelectCurrency}
          onOpenFxTransfer={() => modals.setIsFxTransferOpen(true)}
          onOpenWhatsApp={() => modals.setIsWhatsAppModalOpen(true)}
          onOpenBinance={() => modals.setIsBinanceModalOpen(true)}
          planEnabled={planEnabled}
          onTogglePlan={onTogglePlan}
        />
      )}
    </>
  );
}
