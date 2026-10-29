"use client";

import Decimal from "decimal.js";
import { TransactionDto, AccountDto } from "@/domain/models/types";
import { RotateCcw } from "lucide-react";

interface TransactionsListProps {
  transactions: TransactionDto[];
  accountsMap: Map<string, AccountDto>;
  loading: boolean;
  onReverseTxn: (txnId: string) => void;
  p2pRate: number;
}

export function TransactionsList({
  transactions,
  accountsMap,
  loading,
  onReverseTxn,
  p2pRate,
}: TransactionsListProps) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  };

  const calculateEquivalentUsd = (txn: TransactionDto) => {
    const amount = new Decimal(txn.amount);
    const rate = txn.appliedRate ? new Decimal(txn.appliedRate) : new Decimal(p2pRate);

    if (txn.currency === "USD" || txn.currency === "USDT") {
      return amount;
    }
    if (rate.gt(0)) {
      return amount.div(rate);
    }
    return new Decimal(0);
  };

  return (
    <div className="p-[18px] rounded-[16px] bg-white border border-[#E2E8F0] flex flex-col gap-3 shadow-xs">
      {/* Header (OpenPencil Table header) */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-[800] text-[#0F172A] tracking-tight">
          Actividad Reciente & Auditoría de Tasas P2P
        </h2>
        <span className="text-[11px] text-[#64748B] font-medium hidden sm:inline">
          Libro Mayor Inmutable
        </span>
      </div>

      {loading && transactions.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
          Cargando movimientos...
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          No hay movimientos registrados todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-1 overflow-x-auto">
          {transactions.slice(0, 10).map((txn, index) => {
            const account = accountsMap.get(txn.accountId);
            const isIncome = txn.direction === "Income";
            const isReversal = !!txn.reversesId;
            const eqUsd = calculateEquivalentUsd(txn);

            const rateBadgeText = txn.rateSource
              ? `${txn.rateSource} Bs ${txn.appliedRate?.toFixed(2) || p2pRate.toFixed(2)}`
              : txn.currency === "BOB"
              ? `P2P Bs ${p2pRate.toFixed(2)}`
              : `Paridad 1.00 USD`;

            const isEven = index % 2 === 0;

            return (
              <div
                key={txn.id}
                className={`h-[42px] px-[8px] rounded-[6px] flex items-center justify-between gap-3 text-xs transition-colors group ${
                  isEven ? "bg-white" : "bg-[#F8FAFC]"
                }`}
              >
                {/* 1. Date */}
                <div className="w-[60px] text-[12px] font-[500] text-[#64748B] shrink-0">
                  {formatDate(txn.occurredAt)}
                </div>

                {/* 2. Description */}
                <div className="flex-1 min-w-[140px] truncate text-[13px] font-[600] text-[#0F172A]">
                  <span>{txn.description || "Movimiento"}</span>
                  {isReversal && (
                    <span className="ml-1.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded">
                      Reversión
                    </span>
                  )}
                </div>

                {/* 3. Account / Wallet */}
                <div className="w-[120px] truncate text-[12px] font-[500] text-[#475569] hidden md:block shrink-0">
                  {account?.name || "Cuenta Principal"}
                </div>

                {/* 4. Rate Audit */}
                <div className="w-[110px] text-center text-[11px] font-[600] text-[#2563EB] shrink-0">
                  {rateBadgeText}
                </div>

                {/* 5. Original Amount */}
                <div className="w-[110px] text-right text-[13px] font-[700] text-[#0F172A] font-mono shrink-0">
                  {isIncome ? "+" : "-"}{txn.currency === "BOB" ? "Bs " : ""}{txn.amount.toFixed(2)}{txn.currency !== "BOB" ? ` ${txn.currency}` : ""}
                </div>

                {/* 6. USD Equivalent */}
                <div
                  className={`w-[110px] text-right text-[13px] font-[700] font-mono shrink-0 ${
                    isIncome ? "text-[#059669]" : "text-[#0F172A]"
                  }`}
                >
                  {isIncome ? "+" : "-"}${eqUsd.toFixed(2)} USD
                </div>

                {/* Reverse Action on hover */}
                <div className="w-[28px] flex justify-end shrink-0">
                  {!isReversal && (
                    <button
                      onClick={() => onReverseTxn(txn.id)}
                      title="Revertir movimiento contable"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
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
