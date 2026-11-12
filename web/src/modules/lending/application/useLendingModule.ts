"use client";

import { useState, useMemo, useCallback } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import {
  CreateLoanRequest,
  LoanCancellationResultDto,
  LoanPaymentQuoteDto,
  LoanSummaryDto,
  RegisterLoanPaymentRequest,
  SimulateLoanRequest,
} from "../domain/lending.types";
import { LendingApiRepository } from "../infrastructure/lending-api.repository";
import { notify } from "@/shared/lib/notify";

export function useLendingModule(
  http: IHttpClient | null,
  onLedgerImpacted?: () => Promise<void>
) {
  const [loans, setLoans] = useState<LoanSummaryDto[]>([]);

  const repo = useMemo(
    () => (http ? new LendingApiRepository(http) : null),
    [http]
  );

  const refreshLoans = useCallback(async () => {
    if (!repo) return;
    const data = await repo.getLoans();
    setLoans(data);
  }, [repo]);

  const simulateLoan = useCallback(
    async (req: SimulateLoanRequest) => {
      if (!repo) throw new Error("Cliente no inicializado");
      return repo.simulateLoan(req);
    },
    [repo]
  );

  const createLoan = useCallback(
    async (req: CreateLoanRequest) => {
      if (!repo) return;
      await repo.createLoan(req);
      await Promise.all([refreshLoans(), onLedgerImpacted?.()]);
    },
    [repo, refreshLoans, onLedgerImpacted]
  );

  const getLoanById = useCallback(
    async (id: string) => {
      if (!repo) throw new Error("Cliente no inicializado");
      return repo.getLoanById(id);
    },
    [repo]
  );

  const getPaymentQuote = useCallback(
    async (loanId: string, paymentDate?: string, amount?: string | number): Promise<LoanPaymentQuoteDto> => {
      if (!repo) throw new Error("Cliente no inicializado");
      return repo.getPaymentQuote(loanId, paymentDate, amount);
    },
    [repo]
  );

  const cancelLoan = useCallback(
    async (loanId: string): Promise<LoanCancellationResultDto> => {
      if (!repo) throw new Error("Cliente no inicializado");
      const result = await repo.cancelLoan(loanId);
      setLoans((current) => current.map((loan) => loan.id === loanId ? { ...loan, status: result.status } : loan));
      await Promise.allSettled([refreshLoans(), onLedgerImpacted?.()]);
      return result;
    },
    [repo, refreshLoans, onLedgerImpacted]
  );

  const registerLoanPayment = useCallback(
    async (loanId: string, req: RegisterLoanPaymentRequest) => {
      if (!repo) throw new Error("Cliente no inicializado");
      // The write is authoritative. A failed read refresh must never make the
      // form report an unsaved payment or invite a duplicate POST.
      const res = await repo.registerLoanPayment(loanId, req);
      const safelyRefresh = async (refresh: (() => Promise<void>) | undefined) => {
        if (!refresh) return true;
        try { await refresh(); return true; } catch { return false; }
      };
      const refreshes = await Promise.all([
        safelyRefresh(refreshLoans),
        safelyRefresh(onLedgerImpacted),
      ]);
      if (refreshes.some((succeeded) => !succeeded)) {
        notify.error("Cobro guardado", "No se pudieron actualizar todos los datos. Actualiza la vista para ver el estado reciente.");
      }
      return res;
    },
    [repo, refreshLoans, onLedgerImpacted]
  );

  return {
    loans,
    setLoans,
    refreshLoans,
    simulateLoan,
    createLoan,
    getLoanById,
    getPaymentQuote,
    registerLoanPayment,
    cancelLoan,
  };
}
