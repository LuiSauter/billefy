"use client";

import React, { useState, useEffect } from "react";
import Decimal from "decimal.js";
import { X, ArrowRight, Check, AlertCircle, PlusCircle } from "lucide-react";
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
  onOpenCreateAccount?: () => void;
}

export function FxTransferModal({
  isOpen,
  onClose,
  accounts,
  p2pRate,
  onConfirmTransfer,
  onOpenCreateAccount,
}: FxTransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [loading, setLoading] = useState(false);

  // Initialize accounts default when available
  useEffect(() => {
    if (accounts.length >= 2) {
      if (!fromAccountId || !accounts.some((a) => a.id === fromAccountId)) {
        const bobAcc = accounts.find((a) => a.currency === "BOB") || accounts[0];
        setFromAccountId(bobAcc.id);
      }
      if (!toAccountId || !accounts.some((a) => a.id === toAccountId)) {
        const usdAcc =
          accounts.find((a) => (a.currency === "USDT" || a.currency === "USD") && a.id !== accounts[0].id) ||
          accounts[1] ||
          accounts[0];
        setToAccountId(usdAcc.id);
      }
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

  // Blocker if fewer than 2 accounts exist
  if (accounts.length < 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-[480px] bg-white rounded-[24px] p-6 shadow-2xl border border-[#E2E8F0] relative flex flex-col gap-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-[17px] font-[800] text-[#0F172A] tracking-tight">
              Transferencia entre Cuentas
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-[#64748B] hover:bg-slate-100 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-6 px-2 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-[16px] font-[800] text-[#0F172A]">
              {accounts.length === 0
                ? "No tenés cuentas registradas"
                : "Necesitás al menos 2 cuentas"}
            </h3>
            <p className="text-[12px] text-[#64748B] max-w-[340px] leading-relaxed">
              {accounts.length === 0
                ? "Para transferir o convertir divisas en tiempo real, primero debés registrar al menos dos cuentas en el sistema."
                : "Para realizar una transferencia entre cuentas, necesitás tener registrada una cuenta de origen y otra de destino."}
            </p>
            {onOpenCreateAccount && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateAccount();
                }}
                className="mt-2 h-[42px] px-6 rounded-[12px] bg-[#2563EB] hover:bg-blue-700 text-white text-[13px] font-[800] transition flex items-center gap-2 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>
                  {accounts.length === 0 ? "Crear Primera Cuenta" : "Crear Segunda Cuenta"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const fromAccount = accounts.find((a) => a.id === fromAccountId) || accounts[0];
  const toAccount = accounts.find((a) => a.id === toAccountId) || accounts[1];

  const amountDecimal = new Decimal(amountStr || "0");
  const rateDecimal = new Decimal(p2pRate > 0 ? p2pRate : 9.85);

  let targetAmountDecimal = new Decimal(0);
  if (fromAccount?.currency === "BOB" && (toAccount?.currency === "USD" || toAccount?.currency === "USDT")) {
    targetAmountDecimal = rateDecimal.gt(0) ? amountDecimal.div(rateDecimal) : new Decimal(0);
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
        description: `Conversión FX ${fromAccount?.currency} ➔ ${toAccount?.currency} (Tasa P2P ${p2pRate.toFixed(2)})`,
      });
      setAmountStr("");
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al procesar transferencia FX");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-[580px] bg-white rounded-[20px] p-[24px_24px_28px_24px] shadow-2xl border border-[#E2E8F0] relative flex flex-col gap-4">
        {/* Header (OpenPencil FXH) */}
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-[800] text-[#0F172A] tracking-tight">
            Transferencia entre Cuentas & Conversión FX
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#64748B] hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Conversion Row (OpenPencil BRow) */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* Box From (OpenPencil BFrom) */}
            <div className="p-3.5 rounded-[16px] bg-white border border-[#E2E8F0] flex flex-col gap-1">
              <label className="text-[11px] font-[600] text-[#64748B]">
                Desde: {fromAccount?.name || "Cuenta Origen"}
              </label>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-[16px] font-[900] text-[#0F172A]">
                  {fromAccount?.currency === "BOB" ? "Bs." : "$"}
                </span>
                <input
                  type="number"
                  step="any"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-[20px] font-[900] text-[#0F172A] bg-transparent focus:outline-none placeholder-slate-300"
                />
              </div>
              <span className="text-[11px] font-[700] text-[#64748B]">
                {fromAccount?.currency === "BOB" ? "BOB (Bolivianos)" : fromAccount?.currency}
              </span>
            </div>

            {/* Arrow icon (OpenPencil ArrR) */}
            <div className="flex justify-center">
              <ArrowRight className="w-[18px] h-[18px] text-[#2563EB]" />
            </div>

            {/* Box To (OpenPencil BTo) */}
            <div className="p-3.5 rounded-[16px] bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col gap-1">
              <label className="text-[11px] font-[600] text-[#166534]">
                Hacia: {toAccount?.name || "Cuenta Destino"}
              </label>
              <div className="text-[20px] font-[900] text-[#15803D] font-mono">
                + {targetAmountDecimal.toFixed(2)}
              </div>
              <span className="text-[11px] font-[700] text-[#166534]">
                {toAccount?.currency === "USDT" ? "USDT (Cripto)" : toAccount?.currency}
              </span>
            </div>
          </div>

          {/* Rate Snapshot Pill (OpenPencil RPill) */}
          <div className="p-3 rounded-[12px] bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-between">
            <span className="text-[12px] font-[700] text-[#1D4ED8]">
              Tasa Snapshot: 1 USDT = Bs. {p2pRate.toFixed(2)} (Binance P2P Buy)
            </span>
            <span className="text-[11px] font-[700] text-[#2563EB] font-mono">
              Congelada {secondsLeft}s ⏳
            </span>
          </div>

          {/* Account selectors row */}
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                Cuenta Origen
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:outline-none"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                Cuenta Destino
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:outline-none"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button (OpenPencil BtnFx) */}
          <button
            type="submit"
            disabled={loading || amountDecimal.lte(0)}
            className="w-full h-[48px] rounded-[12px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-[14px] font-[800] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Check className="w-[18px] h-[18px] stroke-[2.5]" />
            <span>Confirmar Transferencia (1-Clic)</span>
          </button>
        </form>
      </div>
    </div>
  );
}
