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
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Actividad Reciente & Auditoría de Tasas P2P
        </h2>
        <span className="text-xs text-slate-400 font-medium">Libro Mayor Inmutable</span>
      </div>

      {loading && transactions.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
          Cargando movimientos del libro mayor...
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          No hay movimientos registrados todavía.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Descripción</th>
                <th className="py-3 px-3">Cuenta / Origen</th>
                <th className="py-3 px-3 text-center">Auditoría Tasa</th>
                <th className="py-3 px-3 text-right">Monto Original</th>
                <th className="py-3 px-3 text-right">Equivalente USD</th>
                <th className="py-3 px-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.slice(0, 10).map((txn) => {
                const account = accountsMap.get(txn.accountId);
                const isIncome = txn.direction === "Income";
                const isReversal = !!txn.reversesId;
                const eqUsd = calculateEquivalentUsd(txn);

                const rateBadgeText = txn.rateSource
                  ? `${txn.rateSource} Bs ${txn.appliedRate?.toFixed(2) || p2pRate.toFixed(2)}`
                  : txn.currency === "BOB"
                  ? `P2P Bs ${p2pRate.toFixed(2)}`
                  : `Paridad 1.00 USD`;

                return (
                  <tr
                    key={txn.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Date */}
                    <td className="py-3.5 px-3 font-medium text-slate-500 whitespace-nowrap">
                      {formatDate(txn.occurredAt)}
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900">
                        {txn.description || "Movimiento"}
                      </div>
                      {isReversal && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                          Reversión
                        </span>
                      )}
                    </td>

                    {/* Account */}
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                      {account?.name || "Cuenta Principal"}
                    </td>

                    {/* Rate Audit Tag */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="text-[11px] font-semibold text-blue-600 bg-blue-50/70 border border-blue-100 px-2 py-0.5 rounded-full">
                        {rateBadgeText}
                      </span>
                    </td>

                    {/* Original Amount */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap font-mono font-extrabold text-slate-900">
                      {isIncome ? "+" : "-"}{txn.currency === "BOB" ? "Bs " : ""}{txn.amount.toFixed(2)}{txn.currency !== "BOB" ? ` ${txn.currency}` : ""}
                    </td>

                    {/* Equivalent USD */}
                    <td
                      className={`py-3.5 px-3 text-right whitespace-nowrap font-mono font-extrabold ${
                        isIncome ? "text-emerald-600" : "text-slate-900"
                      }`}
                    >
                      {isIncome ? "+" : "-"}${eqUsd.toFixed(2)} USD
                    </td>

                    {/* Actions: Reversion */}
                    <td className="py-3.5 px-2 text-right">
                      {!isReversal && (
                        <button
                          onClick={() => onReverseTxn(txn.id)}
                          title="Revertir movimiento contable (Regla 3)"
                          className="p-1.5 rounded-lg text-slate-300 hover:text-amber-600 hover:bg-amber-50 transition opacity-0 group-hover:opacity-100"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
