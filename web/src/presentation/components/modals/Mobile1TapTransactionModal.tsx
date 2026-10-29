"use client";

import React, { useState } from "react";
import { X, Delete, Check, AlertCircle, PlusCircle } from "lucide-react";
import { AccountDto, RegisterTransactionRequest, TransactionDirection } from "@/domain/models/types";

interface Mobile1TapTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountDto[];
  p2pRate: number;
  onRegister: (req: RegisterTransactionRequest) => Promise<void>;
  onOpenCreateAccount?: () => void;
}

export function Mobile1TapTransactionModal({
  isOpen,
  onClose,
  accounts,
  p2pRate,
  onRegister,
  onOpenCreateAccount,
}: Mobile1TapTransactionModalProps) {
  const [direction, setDirection] = useState<TransactionDirection>("Expense");
  const [amountStr, setAmountStr] = useState("0");
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || "");
  const [category, setCategory] = useState("🍔 Alimentos");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Blocker if no accounts exist
  if (accounts.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[24px] border border-[#E2E8F0] shadow-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-[16px] font-[800] text-[#0F172A] tracking-tight">
              Nuevo Movimiento (1-Tap)
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-[16px] font-[800] text-[#0F172A]">
              No tenés cuentas registradas
            </h3>
            <p className="text-[12px] text-[#64748B] max-w-[300px] leading-relaxed">
              Para registrar gastos o ingresos rápidos en 1-Tap, primero necesitás crear una cuenta bancaria o billetera.
            </p>
            {onOpenCreateAccount && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateAccount();
                }}
                className="mt-2 h-[44px] px-6 rounded-[12px] bg-[#2563EB] hover:bg-blue-700 text-white text-[13px] font-[800] transition flex items-center gap-2 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Crear mi primera cuenta</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const numAmount = parseFloat(amountStr) || 0;
  const isUsdt = currentAccount?.currency === "USDT";
  const bobEquiv = isUsdt ? numAmount * p2pRate : numAmount;
  const usdEquiv = isUsdt ? numAmount : numAmount / (p2pRate || 9.85);

  const handleKeyPress = (val: string) => {
    if (val === "⌫") {
      setAmountStr((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
      return;
    }
    if (val === ".") {
      if (!amountStr.includes(".")) {
        setAmountStr((prev) => prev + ".");
      }
      return;
    }
    setAmountStr((prev) => (prev === "0" ? val : prev + val));
  };

  const handleSubmit = async () => {
    if (numAmount <= 0) return;
    setLoading(true);
    try {
      await onRegister({
        accountId: selectedAccountId || accounts[0]?.id || "",
        amount: numAmount.toString(),
        direction,
        categoryId: category,
        description: `1-Tap: ${category}`,
      });
      onClose();
      setAmountStr("0");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    "🍔 Alimentos",
    "🚗 Transporte",
    "🏠 Vivienda",
    "🎉 Ocio",
    "💊 Salud",
    "💼 Sueldo",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[24px] border border-[#E2E8F0] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header (OpenPencil MHead n2237) */}
        <div className="flex items-center justify-between p-4 border-b border-[#F1F5F9]">
          <span className="text-[16px] font-[800] text-[#0F172A] tracking-tight">
            Nuevo Movimiento (1-Tap)
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Tabs: Gasto | Ingreso (OpenPencil MTabs) */}
          <div className="grid grid-cols-2 p-1 rounded-[12px] bg-slate-100 gap-1">
            <button
              type="button"
              onClick={() => setDirection("Expense")}
              className={`py-2 rounded-[9px] text-[12px] font-[700] transition ${
                direction === "Expense"
                  ? "bg-white text-[#EF4444] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              💸 Gasto
            </button>
            <button
              type="button"
              onClick={() => setDirection("Income")}
              className={`py-2 rounded-[9px] text-[12px] font-[700] transition ${
                direction === "Income"
                  ? "bg-white text-[#10B981] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              💰 Ingreso
            </button>
          </div>

          {/* Amount Display (OpenPencil MDisp) */}
          <div className="p-4 rounded-[20px] bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-1">
            <div className="flex items-baseline gap-1 text-[38px] font-[900] font-mono tracking-tight text-[#0F172A]">
              <span className="text-[24px] text-slate-400">
                {currentAccount?.currency === "BOB" ? "Bs." : "$"}
              </span>
              <span>{amountStr}</span>
            </div>
            <span className="text-[12px] font-[600] text-slate-500 font-mono">
              ≈ {isUsdt ? `Bs. ${bobEquiv.toFixed(2)}` : `$${usdEquiv.toFixed(2)} USD`} (P2P Bs {p2pRate.toFixed(2)})
            </span>
          </div>

          {/* Account Chips (OpenPencil MAccChips) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-[700] text-slate-500">Imputar a Cuenta:</span>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {accounts.map((acc) => {
                const isSelected = (selectedAccountId || accounts[0]?.id) === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-[700] whitespace-nowrap transition ${
                      isSelected
                        ? "bg-[#0F172A] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {acc.name} ({acc.currency})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Chips (OpenPencil MCatChips) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-[700] text-slate-500">Categoría:</span>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2 px-1.5 rounded-[12px] text-[11px] font-[700] border transition text-center truncate ${
                      isSelected
                        ? "bg-blue-50 border-blue-500 text-[#2563EB]"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Numeric Keypad (OpenPencil MKeypad) */}
          <div className="grid grid-cols-3 gap-2 pt-1 select-none">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                className="h-[48px] rounded-[14px] bg-slate-100 hover:bg-slate-200 active:scale-95 text-[18px] font-[700] text-[#0F172A] transition flex items-center justify-center font-mono"
              >
                {key === "⌫" ? <Delete className="w-5 h-5 text-slate-600" /> : key}
              </button>
            ))}
          </div>

          {/* Submit Button (OpenPencil MConfirm) */}
          <button
            type="button"
            disabled={loading || numAmount <= 0}
            onClick={handleSubmit}
            className="w-full h-[50px] rounded-[14px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-[15px] font-[800] transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>Confirmar en 1-Tap</span>
          </button>
        </div>
      </div>
    </div>
  );
}
