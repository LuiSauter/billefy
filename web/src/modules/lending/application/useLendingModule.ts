"use client";

import { useState, useMemo, useCallback } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import {
  CreateLoanRequest,
  LoanSummaryDto,
  RegisterLoanPaymentRequest,
  SimulateLoanRequest,
} from "../domain/lending.types";
import { LendingApiRepository } from "../infrastructure/lending-api.repository";

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

  const registerLoanPayment = useCallback(
    async (loanId: string, req: RegisterLoanPaymentRequest) => {
      if (!repo) return;
      const res = await repo.registerLoanPayment(loanId, req);
      await Promise.all([refreshLoans(), onLedgerImpacted?.()]);
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
    registerLoanPayment,
  };
}
