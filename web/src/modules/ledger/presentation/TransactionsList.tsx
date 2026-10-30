"use client";

import React, { useMemo, useState } from "react";
import Decimal from "decimal.js";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Pencil,
  Plus,
} from "lucide-react";
import {
  TransactionDto,
  AccountDto,
  parseTransactionText,
} from "@/modules/ledger/domain/ledger.types";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { CategoryIconBadge } from "./CategoryIcon";

interface TransactionsListProps {
  transactions: TransactionDto[];
  accountsMap: Map<string, AccountDto>;
  loading: boolean;
  onReverseTxn: (txnId: string) => void;
  onEditTxn?: (txn: TransactionDto) => void;
  onOpenNewTxn?: () => void;
  p2pRate: number;
}

export function TransactionsList({
  transactions,
  accountsMap,
  loading,
  onEditTxn,
  onOpenNewTxn,
  p2pRate,
}: TransactionsListProps) {
  const { findCategory } = useUserCategories();
  const [filterDirection, setFilterDirection] = useState<
    "ALL" | "Income" | "Expense"
  >("ALL");

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const datePart = d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    });
    const timePart = d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart}, ${timePart}`;
  };

  const calculateEquivalentUsd = (txn: TransactionDto) => {
    const amount = new Decimal(txn.amount);
    const rate = txn.appliedRate
      ? new Decimal(txn.appliedRate)
      : new Decimal(p2pRate);

    if (txn.currency === "USD" || txn.currency === "USDT") {
      return amount;
    }
    if (rate.gt(0)) {
      return amount.div(rate);
    }
    return new Decimal(0);
  };

  // Hide transactions that were reversed (edited/deleted) and their reversal entries
  const activeTransactions = useMemo(() => {
    const reversedOriginalIds = new Set<string>();
    for (const t of transactions) {
      if (t.reversesId) {
        reversedOriginalIds.add(t.reversesId);
      }
    }
    return transactions.filter(
      (t) => !t.reversesId && !reversedOriginalIds.has(t.id)
    );
  }, [transactions]);

  const displayedTransactions = activeTransactions.filter((txn) =>
    filterDirection === "ALL" ? true : txn.direction === filterDirection
  );

  return (
    <div className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-4 shadow-2xs">
      {/* Header with 1-Click Direction Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-foreground tracking-tight">
            Actividad Reciente
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            Tocá cualquier movimiento para editar sus datos o eliminarlo
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-muted/60 p-1 rounded-xl border border-border">
          {(
            [
              { id: "ALL", label: "Todos" },
              { id: "Expense", label: "Gastos" },
              { id: "Income", label: "Ingresos" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterDirection(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterDirection === tab.id
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading && transactions.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted-foreground animate-pulse">
          Cargando movimientos...
        </div>
      ) : displayedTransactions.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-muted-foreground text-xs font-medium">
            No hay movimientos registrados para este filtro.
          </p>
          {onOpenNewTxn && (
            <button
              type="button"
              onClick={onOpenNewTxn}
              className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-blue-600 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar movimiento</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {displayedTransactions.slice(0, 15).map((txn) => {
            const account = accountsMap.get(txn.accountId);
            const isIncome = txn.direction === "Income";
            const eqUsd = calculateEquivalentUsd(txn);

            const parsedText = parseTransactionText(txn.description);
            const matchedCategory = findCategory(
              txn.categoryId || parsedText.title
            );

            const displayTitle =
              parsedText.title ||
              matchedCategory?.name ||
              (isIncome ? "Ingreso" : "Gasto");

            const rateBadgeText = txn.rateSource
              ? `${txn.rateSource} Bs ${txn.appliedRate?.toFixed(2) || p2pRate.toFixed(2)}`
              : txn.currency === "BOB"
              ? `P2P Bs ${p2pRate.toFixed(2)}`
              : `1.00 USD`;

            return (
              <div
                key={txn.id}
                onClick={() => onEditTxn?.(txn)}
                role={onEditTxn ? "button" : undefined}
                tabIndex={onEditTxn ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onEditTxn && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onEditTxn(txn);
                  }
                }}
                className="py-3 px-2.5 rounded-xl flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors group cursor-pointer"
              >
                {/* Left: Category Icon Badge + Title & Details + Meta */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {matchedCategory ? (
                    <CategoryIconBadge
                      iconKey={matchedCategory.iconKey}
                      colorKey={matchedCategory.colorKey}
                      size="md"
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-rose-500/15 text-rose-500"
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                  )}

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground truncate">
                        {displayTitle}
                      </span>
                      {matchedCategory && (
                        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground border border-border shrink-0">
                          {matchedCategory.name}
                        </span>
                      )}
                    </div>

                    {parsedText.details && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {parsedText.details}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span>{formatDateTime(txn.occurredAt)}</span>
                      <span>•</span>
                      <span className="truncate font-medium">
                        {account?.name || "Cuenta"}
                      </span>
                      <span className="hidden md:inline">•</span>
                      <span className="hidden md:inline font-semibold text-primary">
                        {rateBadgeText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amounts & Edit Action */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end">
                    <span
                      className={`text-sm font-extrabold font-mono tabular-nums ${
                        isIncome ? "text-emerald-500" : "text-foreground"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {txn.currency === "BOB" ? "Bs. " : ""}
                      {txn.amount.toFixed(2)}
                      {txn.currency !== "BOB" ? ` ${txn.currency}` : ""}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground font-mono tabular-nums">
                      ≈ ${eqUsd.toFixed(2)} USD
                    </span>
                  </div>

                  {onEditTxn && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTxn(txn);
                      }}
                      title="Editar o eliminar movimiento"
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
