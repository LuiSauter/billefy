"use client";

import React from "react";
import { AccountDto, DraftDto } from "@/domain/models/types";
import { DashboardModalsController } from "@/application/hooks/useDashboardModals";

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
import { Mobile1TapTransactionModal } from "@/presentation/components/modals/Mobile1TapTransactionModal";

interface ModalsContainerProps {
  modals: DashboardModalsController;
  accounts: AccountDto[];
  pendingDrafts: DraftDto[];
  p2pRate: number;
  actions: {
    createAccount: Parameters<typeof CreateAccountModal>[0]["onSubmit"];
    registerTransaction: Parameters<typeof RegisterTransactionModal>[0]["onSubmit"];
    reconcileAccount: Parameters<typeof ReconcileModal>[0]["onSubmit"];
    simulateLoan: Parameters<typeof CreateLoanModal>[0]["onSimulate"];
    createLoan: Parameters<typeof CreateLoanModal>[0]["onSubmit"];
    registerLoanPayment: (loanId: string, req: Parameters<Parameters<typeof LoanPaymentModal>[0]["onSubmit"]>[0]) => Promise<unknown>;
    createBudget: Parameters<typeof CreateBudgetModal>[0]["onSubmit"];
    createGoal: Parameters<typeof CreateGoalModal>[0]["onSubmit"];
    linkWhatsApp: Parameters<typeof WhatsAppModal>[0]["onLinkPhone"];
    sendWhatsAppWebhook: (phone: string, msg: string) => Promise<string | undefined>;
    connectBinance: Parameters<typeof BinanceModal>[0]["onConnect"];
    syncBinance: Parameters<typeof BinanceModal>[0]["onSync"];
    proposeIncomeDistribution: Parameters<typeof IncomeDistributionModal>[0]["onCalculate"];
    importStatementCsv: Parameters<typeof CsvImportModal>[0]["onSubmit"];
    simulateRawEvent: Parameters<typeof SimulateNotificationModal>[0]["onSubmit"];
    confirmDraft: (draftId: string, data: { accountId: string; description: string }) => Promise<void>;
    confirmAllDrafts: () => Promise<void>;
  };
}

export function ModalsContainer({
  modals,
  accounts,
  pendingDrafts,
  p2pRate,
  actions,
}: ModalsContainerProps) {
  const handleOpenCreateAccount = () => modals.setIsAccountModalOpen(true);

  return (
    <>
      <FxTransferModal
        isOpen={modals.isFxTransferOpen}
        onClose={() => modals.setIsFxTransferOpen(false)}
        accounts={accounts}
        p2pRate={p2pRate}
        onConfirmTransfer={async (data) => {
          await actions.registerTransaction({
            accountId: data.fromAccountId,
            amount: data.amount.toString(),
            direction: "Expense",
            description: data.description,
          });
        }}
        onOpenCreateAccount={handleOpenCreateAccount}
      />

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

      <ReschedulePaymentModal
        isOpen={modals.isRescheduleModalOpen}
        onClose={() => modals.setIsRescheduleModalOpen(false)}
        item={modals.selectedRecurringItem}
        onConfirmPay={(item) => {
          alert(`Pago de ${item.name} por Bs. ${item.amount} confirmado en 1-Clic`);
        }}
        onSaveNewDate={(item, newDate) => {
          alert(`Fecha de vencimiento de ${item.name} actualizada para ${newDate}`);
        }}
      />

      <CreateAccountModal
        isOpen={modals.isAccountModalOpen}
        onClose={() => modals.setIsAccountModalOpen(false)}
        onSubmit={actions.createAccount}
      />

      <RegisterTransactionModal
        isOpen={modals.isTxnModalOpen}
        accounts={accounts}
        defaultAccountId={accounts[0]?.id || ""}
        onClose={() => modals.setIsTxnModalOpen(false)}
        onSubmit={actions.registerTransaction}
        onOpenCreateAccount={handleOpenCreateAccount}
      />

      <ReconcileModal
        isOpen={modals.isReconcileModalOpen}
        account={modals.reconcileAccountTarget}
        onClose={() => modals.setIsReconcileModalOpen(false)}
        onSubmit={actions.reconcileAccount}
      />

      <CreateLoanModal
        isOpen={modals.isLoanModalOpen}
        accounts={accounts}
        onClose={() => modals.setIsLoanModalOpen(false)}
        onSimulate={actions.simulateLoan}
        onSubmit={actions.createLoan}
      />

      <LoanDetailModal
        isOpen={modals.isLoanDetailModalOpen}
        loan={modals.selectedLoanDetail}
        onClose={() => modals.setIsLoanDetailModalOpen(false)}
      />

      <LoanPaymentModal
        isOpen={modals.isLoanPaymentModalOpen}
        accounts={accounts}
        onClose={() => modals.setIsLoanPaymentModalOpen(false)}
        onSubmit={async (req) => {
          await actions.registerLoanPayment(modals.selectedLoanId, req);
        }}
      />

      <CreateBudgetModal
        isOpen={modals.isBudgetModalOpen}
        onClose={() => modals.setIsBudgetModalOpen(false)}
        onSubmit={actions.createBudget}
      />

      <CreateGoalModal
        isOpen={modals.isGoalModalOpen}
        accounts={accounts}
        onClose={() => modals.setIsGoalModalOpen(false)}
        onSubmit={actions.createGoal}
        p2pRate={p2pRate}
      />

      <WhatsAppModal
        isOpen={modals.isWhatsAppModalOpen}
        onClose={() => modals.setIsWhatsAppModalOpen(false)}
        onLinkPhone={actions.linkWhatsApp}
        onSendMessage={(msg) => actions.sendWhatsAppWebhook("+591 70000000", msg)}
      />

      <BinanceModal
        isOpen={modals.isBinanceModalOpen}
        accounts={accounts}
        onClose={() => modals.setIsBinanceModalOpen(false)}
        onConnect={actions.connectBinance}
        onSync={actions.syncBinance}
      />

      <IncomeDistributionModal
        isOpen={modals.isDistributeModalOpen}
        onClose={() => modals.setIsDistributeModalOpen(false)}
        onCalculate={actions.proposeIncomeDistribution}
      />

      <CsvImportModal
        isOpen={modals.isCsvModalOpen}
        accounts={accounts}
        onClose={() => modals.setIsCsvModalOpen(false)}
        onSubmit={actions.importStatementCsv}
        onOpenCreateAccount={handleOpenCreateAccount}
      />

      <SimulateNotificationModal
        isOpen={modals.isSimulateModalOpen}
        onClose={() => modals.setIsSimulateModalOpen(false)}
        onSubmit={actions.simulateRawEvent}
      />

      <Mobile1TapTransactionModal
        isOpen={modals.isMobile1TapTxnOpen}
        onClose={() => modals.setIsMobile1TapTxnOpen(false)}
        accounts={accounts}
        p2pRate={p2pRate}
        onRegister={actions.registerTransaction}
        onOpenCreateAccount={handleOpenCreateAccount}
      />
    </>
  );
}
