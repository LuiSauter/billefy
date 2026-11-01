"use client";

import { useState, useMemo, useCallback } from "react";
import { notify } from "@/shared/lib/notify";
import { IHttpClient } from "@/shared/application/http-client.contract";
import {
  AccountDto,
  CreateAccountRequest,
  RegisterTransactionRequest,
  UpdateTransactionRequest,
  TransactionDto,
} from "../domain/ledger.types";
import { LedgerApiRepository } from "../infrastructure/ledger-api.repository";
import { convertCurrencyAmount } from "@/modules/fx/domain/fx.types";

export interface FxTransferCommand {
  fromAccountId: string;
  toAccountId: string;
  amount: number | string;
  description: string;
  p2pRate: number;
}

export function useLedgerModule(http: IHttpClient | null) {
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);

  const repo = useMemo(
    () => (http ? new LedgerApiRepository(http) : null),
    [http]
  );

  const refreshLedger = useCallback(async () => {
    if (!repo) return;
    const [accountsData, txnsData] = await Promise.all([
      repo.getAccounts(),
      repo.getTransactions({ limit: 500 }),
    ]);
    setAccounts(accountsData);
    setTransactions(txnsData);
  }, [repo]);

  const accountsMap = useMemo(() => {
    const map = new Map<string, AccountDto>();
    for (const acc of accounts) {
      map.set(acc.id, acc);
    }
    return map;
  }, [accounts]);

  const createAccount = useCallback(
    async (req: CreateAccountRequest) => {
      if (!repo) return;
      await repo.createAccount(req);
      await refreshLedger();
    },
    [repo, refreshLedger]
  );

  const updateAccount = useCallback(
    async (id: string, data: { name: string; iconKey: string; colorKey: string }) => {
      if (!repo) return;
      await repo.updateAccount(id, data);
      await refreshLedger();
    },
    [repo, refreshLedger]
  );

  const registerTransaction = useCallback(
    async (req: RegisterTransactionRequest) => {
      if (!repo) return;
      await repo.registerTransaction(req);
      await refreshLedger();
    },
    [repo, refreshLedger]
  );

  const updateTransaction = useCallback(
    async (txnId: string, req: UpdateTransactionRequest) => {
      if (!repo) return;
      await repo.updateTransaction(txnId, req);
      await refreshLedger();
    },
    [repo, refreshLedger]
  );

  const reverseTransaction = useCallback(
    async (txnId: string) => {
      if (!repo) return;
      await repo.reverseTransaction(txnId, "Reversión solicitada por el usuario");
      await refreshLedger();
    },
    [repo, refreshLedger]
  );

  const reconcileAccount = useCallback(
    async (accountId: string, realBalance: number, notes?: string) => {
      if (!repo) return;
      const res = await repo.reconcileAccount(accountId, { realBalance, notes });
      if (res.difference === 0) {
        notify.info(
          "Conciliación completada",
          "El saldo ya coincide exactamente con el Libro Mayor."
        );
      } else {
        notify.success(
          "Conciliación exitosa",
          `Ajuste aplicado: ${res.difference > 0 ? "+" : ""}${res.difference.toFixed(2)}.`
        );
      }
      await refreshLedger();
    },
    [repo, refreshLedger]
  );

  const executeFxTransfer = useCallback(
    async (cmd: FxTransferCommand) => {
      if (!repo) return;
      const fromAcc = accountsMap.get(cmd.fromAccountId);
      const toAcc = accountsMap.get(cmd.toAccountId);
      if (!fromAcc || !toAcc) throw new Error("No se encontraron las cuentas de la transferencia.");

      const converted = convertCurrencyAmount(cmd.amount, fromAcc.currency, toAcc.currency, cmd.p2pRate);
      await repo.registerTransfer({
        sourceAccountId: fromAcc.id,
        sourceAmount: cmd.amount.toString(),
        destinationAccountId: toAcc.id,
        destinationAmount: converted.toFixed(2),
        description: cmd.description,
      });
      await refreshLedger();
    },
    [repo, accountsMap, refreshLedger]
  );

  return {
    accounts,
    setAccounts,
    accountsMap,
    transactions,
    setTransactions,
    refreshLedger,
    createAccount,
    updateAccount,
    registerTransaction,
    updateTransaction,
    reverseTransaction,
    reconcileAccount,
    executeFxTransfer,
  };
}
