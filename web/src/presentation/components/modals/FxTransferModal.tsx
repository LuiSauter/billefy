"use client";

import React, { useState, useEffect } from "react";
import Decimal from "decimal.js";
import { X, ArrowRight, Check } from "lucide-react";
import { AccountDto } from "@/domain/models/types";

interface FxTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountDto[];
  p2pRate: number;
  onConfirmTransfer: (data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
  }) => Promise<void>;
}

export function FxTransferModal({
  isOpen,
  onClose,
  accounts,
  p2pRate,
  onConfirmTransfer,
}: FxTransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amountStr, setAmountStr] = useState("35000");
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [loading, setLoading] = useState(false);

  // Initialize accounts default
  useEffect(() => {
    if (accounts.length >= 2 && !fromAccountId && !toAccountId) {
      const bobAcc = accounts.find((a) => a.currency === "BOB") || accounts[0];
      const usdAcc =
        accounts.find((a) => a.currency === "USDT" || a.currency === "USD") ||
        accounts[1] ||
        accounts[0];
      setFromAccountId(bobAcc.id);
      setToAccountId(usdAcc.id);
    }
  }, [accounts, fromAccountId, toAccountId]);

  // Countdown timer for rate freeze (45s loop)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 45 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const fromAccount = accounts.find((a) => a.id === fromAccountId) || accounts[0];
  const toAccount = accounts.find((a) => a.id === toAccountId) || accounts[1];

  const amountDecimal = new Decimal(amountStr || "0");
  const rateDecimal = new Decimal(p2pRate > 0 ? p2pRate : 9.85);

  let targetAmountDecimal = new Decimal(0);
  if (fromAccount?.currency === "BOB" && (toAccount?.currency === "USD" || toAccount?.currency === "USDT")) {
    targetAmountDecimal = amountDecimal.div(rateDecimal);
  } else if ((fromAccount?.currency === "USD" || fromAccount?.currency === "USDT") && toAccount?.currency === "BOB") {
    targetAmountDecimal = amountDecimal.times(rateDecimal);
  } else {
    targetAmountDecimal = amountDecimal;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId || amountDecimal.lte(0)) return;

    try {
      setLoading(true);
      await onConfirmTransfer({
        fromAccountId,
        toAccountId,
        amount: amountDecimal.toNumber(),
        description: `Conversión FX ${fromAccount?.currency} ➔ ${toAccount?.currency} (Tasa P2P ${p2pRate})`,
      });
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al procesar transferencia FX");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 lg:p-8 shadow-2xl border border-slate-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Transferencia entre Cuentas & Conversión FX
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Origen vs Destino Split Box */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-4">
            {/* Box 1 (Origen) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Desde: {fromAccount?.name || "Seleccionar Cuenta"}
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full text-xs font-medium text-slate-700 bg-transparent border-b border-slate-200 pb-1 mb-2 focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>

              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-slate-400">
                  {fromAccount?.currency === "BOB" ? "Bs." : "$"}
                </span>
                <input
                  type="number"
                  step="any"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full text-2xl font-extrabold text-slate-900 font-mono bg-transparent focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                {fromAccount?.currency} ({fromAccount?.currency === "BOB" ? "Bolivianos" : "Dólares"})
              </p>
            </div>

            {/* Middle Arrow */}
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Box 2 (Destino - Green Card) */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
              <label className="block text-xs font-semibold text-emerald-800 mb-1">
                Hacia: {toAccount?.name || "Seleccionar Cuenta"}
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full text-xs font-medium text-emerald-800 bg-transparent border-b border-emerald-200 pb-1 mb-2 focus:outline-none"
              >
                {accounts
                  .filter((a) => a.id !== fromAccountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
              </select>

              <div className="text-2xl font-extrabold text-emerald-700 font-mono">
                + {targetAmountDecimal.toFixed(2)}
              </div>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">
                {toAccount?.currency} ({toAccount?.currency === "USDT" ? "Cripto" : "Destino"})
              </p>
            </div>
          </div>

          {/* Rate Snapshot Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-900">
              Tasa Snapshot: 1 USDT = Bs. {p2pRate.toFixed(2)} (Binance P2P Buy)
            </span>
            <span className="font-medium text-blue-700 bg-white/80 border border-blue-200 px-2 py-0.5 rounded-full shadow-2xs font-mono">
              Congelada {secondsLeft}s ⌛
            </span>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{loading ? "Procesando..." : "Confirmar Transferencia (1-Clic)"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
