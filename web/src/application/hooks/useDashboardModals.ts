"use client";

import { useState } from "react";
import { AccountDto, LoanDetailDto } from "@/domain/models/types";
import { RecurringItem } from "@/presentation/components/recurring/RecurringPaymentsView";

export function useDashboardModals(getLoanById: (loanId: string) => Promise<LoanDetailDto>) {
  // Modal visibility states
  const [isFxTransferOpen, setIsFxTransferOpen] = useState(false);
  const [isDraftsDrawerOpen, setIsDraftsDrawerOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [isMobile1TapTxnOpen, setIsMobile1TapTxnOpen] = useState(false);
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
  const [selectedRecurringItem, setSelectedRecurringItem] = useState<RecurringItem | null>(null);

  const openLoanDetail = async (loanId: string) => {
    try {
      const detail = await getLoanById(loanId);
      setSelectedLoanDetail(detail);
      setIsLoanDetailModalOpen(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al cargar detalle");
    }
  };

  const openLoanPayment = (loanId: string) => {
    setSelectedLoanId(loanId);
    setIsLoanPaymentModalOpen(true);
  };

  const openReconcile = (account: AccountDto) => {
    setReconcileAccountTarget(account);
    setIsReconcileModalOpen(true);
  };

  const openReschedule = (item: RecurringItem) => {
    setSelectedRecurringItem(item);
    setIsRescheduleModalOpen(true);
  };

  return {
    // Visibility
    isFxTransferOpen,
    setIsFxTransferOpen,
    isDraftsDrawerOpen,
    setIsDraftsDrawerOpen,
    isRescheduleModalOpen,
    setIsRescheduleModalOpen,
    isAccountModalOpen,
    setIsAccountModalOpen,
    isTxnModalOpen,
    setIsTxnModalOpen,
    isMobile1TapTxnOpen,
    setIsMobile1TapTxnOpen,
    isSimulateModalOpen,
    setIsSimulateModalOpen,
    isReconcileModalOpen,
    setIsReconcileModalOpen,
    isCsvModalOpen,
    setIsCsvModalOpen,
    isLoanModalOpen,
    setIsLoanModalOpen,
    isLoanPaymentModalOpen,
    setIsLoanPaymentModalOpen,
    isLoanDetailModalOpen,
    setIsLoanDetailModalOpen,
    isBudgetModalOpen,
    setIsBudgetModalOpen,
    isGoalModalOpen,
    setIsGoalModalOpen,
    isWhatsAppModalOpen,
    setIsWhatsAppModalOpen,
    isBinanceModalOpen,
    setIsBinanceModalOpen,
    isDistributeModalOpen,
    setIsDistributeModalOpen,

    // Targets
    reconcileAccountTarget,
    selectedLoanId,
    selectedLoanDetail,
    selectedRecurringItem,

    // Handlers
    openLoanDetail,
    openLoanPayment,
    openReconcile,
    openReschedule,
  };
}

export type DashboardModalsController = ReturnType<typeof useDashboardModals>;
