"use client";

import { useRef, useState } from "react";
import { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import { LoanDetailDto, LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { notify } from "@/shared/lib/notify";
import { RecurringItem } from "@/modules/planning/presentation/RecurringPaymentsView";

export function useDashboardModals(getLoanById: (loanId: string) => Promise<LoanDetailDto>) {
  // Modal visibility states
  const [isFxTransferOpen, setIsFxTransferOpen] = useState(false);
  const [isDraftsDrawerOpen, setIsDraftsDrawerOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [isEditTxnModalOpen, setIsEditTxnModalOpen] = useState(false);
  const [isMobile1TapTxnOpen, setIsMobile1TapTxnOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isCreateDebtModalOpen, setIsCreateDebtModalOpen] = useState(false);
  const [isCreateLentModalOpen, setIsCreateLentModalOpen] = useState(false);
  const [isLoanPaymentModalOpen, setIsLoanPaymentModalOpen] = useState(false);
  const [isLoanDetailModalOpen, setIsLoanDetailModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isBinanceModalOpen, setIsBinanceModalOpen] = useState(false);
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Selected entities for modals
  const [reconcileAccountTarget, setReconcileAccountTarget] = useState<AccountDto | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<TransactionDto | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<LoanSummaryDto | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [selectedInstallmentNumber, setSelectedInstallmentNumber] = useState<number | undefined>();
  const paymentRequest = useRef(0);
  const paymentLoans = useRef<LoanSummaryDto[] | undefined>(undefined);
  const detailRequest = useRef(0);
  const detailSnapshot = useRef<LoanDetailDto | null>(null);
  const [selectedLoanDetail, setSelectedLoanDetail] = useState<LoanDetailDto | null>(null);
  const [selectedRecurringItem, setSelectedRecurringItem] = useState<RecurringItem | null>(null);

  const openEditTransaction = (txn: TransactionDto) => {
    setEditingTransaction(txn);
    setIsEditTxnModalOpen(true);
  };

  const openLoanDetail = async (loanId: string) => {
    const request = ++detailRequest.current;
    detailSnapshot.current = null;
    try {
      const detail = await getLoanById(loanId);
      if (detailRequest.current !== request || detail.summary.id !== loanId) return;
      detailSnapshot.current = detail;
      setSelectedLoanDetail(detail);
      setIsLoanDetailModalOpen(true);
    } catch (err: unknown) {
      if (detailRequest.current === request) notify.error("Error al cargar detalle del préstamo", err);
    }
  };
  const closeLoanDetail = () => { detailRequest.current += 1; setIsLoanDetailModalOpen(false); };
  const refreshSelectedLoanDetail = async (loanId: string) => {
    if (detailSnapshot.current?.summary.id !== loanId) return;
    const request = detailRequest.current;
    try {
      const refreshed = await getLoanById(loanId);
      if (detailRequest.current === request && detailSnapshot.current?.summary.id === loanId && refreshed.summary.id === loanId) {
        detailSnapshot.current = refreshed;
        setSelectedLoanDetail(refreshed);
      }
    } catch {
      if (detailRequest.current === request && detailSnapshot.current?.summary.id === loanId) {
        notify.error("Cobro guardado", "No se pudo actualizar el historial del préstamo. Actualiza el detalle para ver los datos recientes.");
      }
    }
  };

  const openLoanPayment = async (loanOrId: string | LoanSummaryDto, allLoans?: LoanSummaryDto[], installmentNumber?: number) => {
    const loanId = typeof loanOrId === "string" ? loanOrId : loanOrId.id;
    setSelectedInstallmentNumber(installmentNumber);
    setPaymentError("");
    if (!loanId) { paymentRequest.current += 1; setPaymentLoading(false); setSelectedInstallmentNumber(undefined); setSelectedLoanForPayment(null); setSelectedLoanId(""); setIsLoanPaymentModalOpen(true); return; }
    paymentLoans.current = allLoans;
    const request = ++paymentRequest.current;
    setSelectedLoanId(loanId);
    setSelectedLoanForPayment(null);
    setPaymentLoading(true);
    setIsLoanPaymentModalOpen(true);
    try {
      const detail = await getLoanById(loanId);
      if (paymentRequest.current !== request) return;
      if (detail.summary.id !== loanId) throw new Error("El servidor devolvió otro préstamo.");
      if (!["Active", "InArrears"].includes(detail.summary.status)) throw new Error("Este préstamo no admite pagos.");
      setSelectedLoanForPayment(detail.summary);
    } catch {
      if (paymentRequest.current === request) setPaymentError("No se pudo cargar el préstamo. Reintenta para continuar.");
    } finally { if (paymentRequest.current === request) setPaymentLoading(false); }
  };
  const closeLoanPayment = () => { paymentRequest.current += 1; setIsLoanPaymentModalOpen(false); setPaymentLoading(false); setPaymentError(""); setSelectedLoanForPayment(null); };
  const retryLoanPayment = () => { if (selectedLoanId) void openLoanPayment(selectedLoanId, paymentLoans.current, selectedInstallmentNumber); };

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
    isEditTxnModalOpen,
    setIsEditTxnModalOpen,
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
    isCreateDebtModalOpen,
    setIsCreateDebtModalOpen,
    isCreateLentModalOpen,
    setIsCreateLentModalOpen,
    isLoanPaymentModalOpen,
    setIsLoanPaymentModalOpen,
    paymentLoading,
    paymentError,
    selectedInstallmentNumber,
    closeLoanPayment,
    retryLoanPayment,
    closeLoanDetail,
    refreshSelectedLoanDetail,
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
    isProfileModalOpen,
    setIsProfileModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,

    // Targets
    reconcileAccountTarget,
    editingTransaction,
    selectedLoanId,
    selectedLoanForPayment,
    setSelectedLoanForPayment,
    selectedLoanDetail,
    selectedRecurringItem,

    // Handlers
    openLoanDetail,
    openLoanPayment,
    openReconcile,
    openReschedule,
    openEditTransaction,
  };
}

export type DashboardModalsController = ReturnType<typeof useDashboardModals>;
