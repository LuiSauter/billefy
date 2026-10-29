"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Decimal from "decimal.js";
import {
  BillefyApiClient,
  AccountDto,
  TransactionDto,
  DraftDto,
  LoanSummaryDto,
  BudgetDto,
  GoalDto,
  FinancialHealthDto,
  RateSnapshotDto,
  CreateAccountRequest,
  RegisterTransactionRequest,
  ConfirmDraftRequest,
  CreateBudgetRequest,
  CreateGoalRequest,
  CreateLoanRequest,
  SimulateLoanRequest,
  RegisterLoanPaymentRequest,
  ImportStatementCsvRequest,
  ConnectBinanceKeyRequest,
  ProposeIncomeDistributionRequest,
} from "../../infrastructure/api/client";

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function useDashboardData(authToken?: string | null, authUserId?: string | null) {
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [drafts, setDrafts] = useState<DraftDto[]>([]);
  const [loans, setLoans] = useState<LoanSummaryDto[]>([]);
  const [budgets, setBudgets] = useState<BudgetDto[]>([]);
  const [goals, setGoals] = useState<GoalDto[]>([]);
  const [health, setHealth] = useState<FinancialHealthDto | null>(null);
  const [rate, setRate] = useState<RateSnapshotDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(() => {
    const effectiveToken =
      authToken ||
      (typeof window !== "undefined" ? localStorage.getItem("billefy_access_token") : null);
    if (!effectiveToken) return null;

    let fallbackUserId: string | undefined;
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("billefy_user");
        if (storedUser) fallbackUserId = JSON.parse(storedUser)?.id;
      } catch {
        // Ignore parse errors
      }
    }

    return new BillefyApiClient({
      baseUrl: DEFAULT_API_URL,
      authToken: effectiveToken,
      userId: authUserId || fallbackUserId,
    });
  }, [authToken, authUserId]);

  const loadData = useCallback(async () => {
    if (!client) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        accountsData,
        txnsData,
        draftsData,
        loansData,
        budgetsData,
        goalsData,
        healthData,
        rateData,
      ] = await Promise.all([
        client.getAccounts(),
        client.getTransactions({ limit: 20 }),
        client.getDrafts(),
        client.getLoans(),
        client.getBudgets().catch(() => []),
        client.getGoals().catch(() => []),
        client.getFinancialHealth().catch(() => null),
        client.getLatestRate("BOB", "USD").catch(() => null),
      ]);

      setAccounts(accountsData);
      setTransactions(txnsData);
      setDrafts(draftsData);
      setLoans(loansData);
      setBudgets(budgetsData);
      setGoals(goalsData);
      setHealth(healthData);
      setRate(rateData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al conectar con el servidor.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (client) {
      loadData();
    }
  }, [client, loadData]);

  const accountsMap = useMemo(() => {
    const map = new Map<string, AccountDto>();
    for (const acc of accounts) {
      map.set(acc.id, acc);
    }
    return map;
  }, [accounts]);

  const pendingDrafts = useMemo(() => {
    return drafts.filter((d) => d.status === "Pending" || d.status === "Review");
  }, [drafts]);

  const totals = useMemo(() => {
    let bobTotal = new Decimal(0);
    let usdTotal = new Decimal(0);

    for (const acc of accounts) {
      if (acc.currency === "BOB") {
        bobTotal = bobTotal.plus(acc.balance);
      } else if (acc.currency === "USD") {
        usdTotal = usdTotal.plus(acc.balance);
      }
    }

    let consolidatedUsd = usdTotal;
    if (rate && rate.appliedRate > 0) {
      const bobValuedInUsd = bobTotal.dividedBy(new Decimal(rate.appliedRate));
      consolidatedUsd = usdTotal.plus(bobValuedInUsd);
    }

    return { bobTotal, usdTotal, consolidatedUsd };
  }, [accounts, rate]);

  // Use-case actions
  const createAccount = async (req: CreateAccountRequest) => {
    if (!client) return;
    await client.createAccount(req);
    await loadData();
  };

  const registerTransaction = async (req: RegisterTransactionRequest) => {
    if (!client) return;
    await client.registerTransaction(req);
    await loadData();
  };

  const reverseTransaction = async (txnId: string) => {
    if (!client) return;
    await client.reverseTransaction(txnId, "Reversión solicitada por el usuario");
    await loadData();
  };

  const confirmDraft = async (draftId: string, req: ConfirmDraftRequest) => {
    if (!client) return;
    await client.confirmDraft(draftId, req);
    await loadData();
  };

  const discardDraft = async (draftId: string) => {
    if (!client) return;
    await client.discardDraft(draftId);
    await loadData();
  };

  const reconcileAccount = async (accountId: string, realBalance: number, notes?: string) => {
    if (!client) return;
    const res = await client.reconcileAccount(accountId, { realBalance, notes });
    if (res.difference === 0) {
      alert("El saldo ya coincide exactamente con el Libro Mayor.");
    } else {
      alert(`Conciliación exitosa. Ajuste aplicado: ${res.difference > 0 ? "+" : ""}${res.difference.toFixed(2)}.`);
    }
    await loadData();
  };

  const importStatementCsv = async (req: ImportStatementCsvRequest) => {
    if (!client) throw new Error("Cliente no inicializado");
    const res = await client.importStatementCsv(req);
    await loadData();
    return res;
  };

  const simulateLoan = async (req: SimulateLoanRequest) => {
    if (!client) throw new Error("Cliente no inicializado");
    return client.simulateLoan(req);
  };

  const createLoan = async (req: CreateLoanRequest) => {
    if (!client) return;
    await client.createLoan(req);
    await loadData();
  };

  const getLoanById = async (id: string) => {
    if (!client) throw new Error("Cliente no inicializado");
    return client.getLoanById(id);
  };

  const registerLoanPayment = async (loanId: string, req: RegisterLoanPaymentRequest) => {
    if (!client) return;
    const res = await client.registerLoanPayment(loanId, req);
    await loadData();
    return res;
  };

  const createBudget = async (req: CreateBudgetRequest) => {
    if (!client) return;
    await client.createBudget(req);
    await loadData();
  };

  const createGoal = async (req: CreateGoalRequest) => {
    if (!client) return;
    await client.createGoal(req);
    await loadData();
  };

  const linkWhatsApp = async (phoneNumber: string) => {
    if (!client) throw new Error("Cliente no inicializado");
    return client.linkWhatsApp({ phoneNumber });
  };

  const sendWhatsAppWebhook = async (fromNumber: string, messageText: string) => {
    if (!client) throw new Error("Cliente no inicializado");
    const msgId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "msg-test";
    const res = await client.sendWhatsAppWebhook({
      providerMessageId: msgId,
      fromNumber,
      messageText,
    });
    await loadData();
    return res.replyText;
  };

  const connectBinance = async (req: ConnectBinanceKeyRequest) => {
    if (!client) throw new Error("Cliente no inicializado");
    return client.connectBinanceKey(req);
  };

  const syncBinance = async (accountId: string) => {
    if (!client) return;
    const res = await client.syncBinance({ accountId });
    alert(`Sincronización completada. Borradores creados: ${res.draftsCreated}, duplicados: ${res.duplicatesLinked}`);
    await loadData();
  };

  const proposeIncomeDistribution = async (req: ProposeIncomeDistributionRequest) => {
    if (!client) throw new Error("Cliente no inicializado");
    return client.proposeIncomeDistribution(req);
  };

  const simulateRawEvent = async (text: string) => {
    if (!client) return;
    const eventId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "11111111-1111-1111-1111-111111111111";

    await fetch(`${DEFAULT_API_URL}/v1/ingestion/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(authUserId ? { "X-User-Id": authUserId } : {}),
        "Idempotency-Key": eventId,
      },
      body: JSON.stringify({
        eventId,
        channel: "notification",
        sourceId: "com.banco.union",
        maskedText: text,
      }),
    });
    await loadData();
  };

  return {
    userId: authUserId || "",
    accounts,
    accountsMap,
    transactions,
    drafts,
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
  };
}
