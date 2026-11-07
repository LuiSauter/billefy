"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { FetchHttpClient } from "@/shared/infrastructure/fetch-http.client";
import { defaultTokenStorage } from "@/shared/infrastructure/local-storage-token.adapter";
import { calculatePortfolioTotals } from "@/modules/ledger/domain/balance-calculator";
import { useLedgerModule } from "@/modules/ledger/application/useLedgerModule";
import { useFxModule } from "@/modules/fx/application/useFxModule";
import { useIngestionModule } from "@/modules/ingestion/application/useIngestionModule";
import { useLendingModule } from "@/modules/lending/application/useLendingModule";
import { usePlanningModule } from "@/modules/planning/application/usePlanningModule";
import { useMessagingModule } from "@/modules/messaging/application/useMessagingModule";

export function useDashboardData(authToken?: string | null, authUserId?: string | null) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const httpClient = useMemo(() => {
    const effectiveToken = authToken || defaultTokenStorage.getAccessToken();
    if (!effectiveToken) return null;

    const fallbackUserId = defaultTokenStorage.getUser()?.id;
    return new FetchHttpClient({
      authToken: effectiveToken,
      userId: authUserId || fallbackUserId,
    });
  }, [authToken, authUserId]);

  const ledger = useLedgerModule(httpClient);
  const fx = useFxModule(httpClient);
  const planning = usePlanningModule(httpClient);

  const { refreshLedger } = ledger;
  const { refreshRate } = fx;
  const { refreshPlanning } = planning;

  const onLedgerAndPlanningImpacted = useCallback(async () => {
    await Promise.all([refreshLedger(), refreshPlanning()]);
  }, [refreshLedger, refreshPlanning]);

  const ingestion = useIngestionModule(httpClient, onLedgerAndPlanningImpacted);
  const lending = useLendingModule(httpClient, onLedgerAndPlanningImpacted);
  const messaging = useMessagingModule(httpClient, ingestion.refreshDrafts);

  const { refreshDrafts } = ingestion;
  const { refreshLoans } = lending;

  const loadData = useCallback(async () => {
    if (!httpClient) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        refreshLedger(),
        refreshDrafts(),
        refreshLoans(),
        refreshPlanning(),
        refreshRate(),
      ]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al conectar con el servidor.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    httpClient,
    refreshLedger,
    refreshDrafts,
    refreshLoans,
    refreshPlanning,
    refreshRate,
  ]);

  useEffect(() => {
    if (httpClient) {
      loadData();
    }
  }, [httpClient, loadData]);

  const totals = useMemo(
    () => calculatePortfolioTotals(ledger.accounts, fx.rate),
    [ledger.accounts, fx.rate]
  );

  return {
    userId: authUserId || "",
    refreshFinancialData: loadData,
    accounts: ledger.accounts,
    accountsMap: ledger.accountsMap,
    transactions: ledger.transactions,
    refreshLedger: ledger.refreshLedger,
    drafts: ingestion.drafts,
    pendingDrafts: ingestion.pendingDrafts,
    loans: lending.loans,
    budgets: planning.budgets,
    budgetsLoading: planning.budgetsLoading,
    budgetsError: planning.budgetsError,
    refreshBudgets: planning.refreshBudgets,
    goals: planning.goals,
    health: planning.health,
    planningOverviewStatus: planning.planningOverviewStatus,
    planningOverviewError: planning.planningOverviewError,
    retryPlanningOverview: planning.retryPlanningOverview,
    planningRepo: planning.planningRepo,
    rate: fx.rate,
    totals,
    loading,
    error,
    createAccount: ledger.createAccount,
    updateAccount: ledger.updateAccount,
    registerTransaction: ledger.registerTransaction,
    updateTransaction: ledger.updateTransaction,
    reverseTransaction: ledger.reverseTransaction,
    reconcileAccount: ledger.reconcileAccount,
    executeFxTransfer: ledger.executeFxTransfer,
    confirmDraft: ingestion.confirmDraft,
    discardDraft: ingestion.discardDraft,
    importStatementCsv: ingestion.importStatementCsv,
    connectBinance: ingestion.connectBinance,
    syncBinance: ingestion.syncBinance,
    simulateRawEvent: ingestion.simulateRawEvent,
    simulateLoan: lending.simulateLoan,
    createLoan: lending.createLoan,
    getLoanById: lending.getLoanById,
    registerLoanPayment: lending.registerLoanPayment,
    cancelLoan: lending.cancelLoan,
    createBudget: planning.createBudget,
    updateBudget: planning.updateBudget,
    createGoal: planning.createGoal,
    updateGoal: planning.updateGoal,
    deleteGoal: planning.deleteGoal,
    proposeIncomeDistribution: planning.proposeIncomeDistribution,
    linkWhatsApp: messaging.linkWhatsApp,
    sendWhatsAppWebhook: messaging.sendWhatsAppWebhook,
  };
}
