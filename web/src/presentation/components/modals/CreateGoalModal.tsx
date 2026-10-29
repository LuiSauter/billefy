"use client";

import React, { useState } from "react";
import { AccountDto, CreateGoalRequest } from "@/domain/models/types";
import { X, Calendar } from "lucide-react";

interface CreateGoalModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  onClose: () => void;
  onSubmit: (req: CreateGoalRequest) => Promise<void>;
  p2pRate?: number;
}

export function CreateGoalModal({
  isOpen,
  accounts,
  onClose,
  onSubmit,
  p2pRate = 9.85,
}: CreateGoalModalProps) {
  const [name, setName] = useState("🏡 Entrada Departamento");
  const [targetAmount, setTargetAmount] = useState("15000");
  const [currency, setCurrency] = useState("USDT");
  const [targetDate, setTargetDate] = useState("2025-12-31");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const targetNum = parseFloat(targetAmount) || 0;
  const isCrypto = currency === "USDT" || currency === "USD";
  const bobEquivalent = isCrypto ? (targetNum * p2pRate).toFixed(2) : targetNum.toFixed(2);

  // Suggested monthly projection for 19 months
  const months = 19;
  const monthlyProjection = (targetNum / months).toFixed(2);
  const monthlyBob = isCrypto ? (parseFloat(monthlyProjection) * p2pRate).toFixed(2) : monthlyProjection;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || targetNum <= 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        targetAmount: targetNum,
        currency,
        targetDate: targetDate || undefined,
        accountId: accountId || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-[500px] bg-white rounded-[24px] p-[24px_24px_28px_24px] shadow-2xl border border-[#E2E8F0] relative max-h-[90vh] overflow-y-auto flex flex-col gap-4">
        {/* Header (OpenPencil MAGWH) */}
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-[800] text-[#0F172A] tracking-tight">
            Crear Nuevo Objetivo Financiero
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#64748B] hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Field 1: Name (InGNameW) */}
          <div className="h-[44px] px-3.5 rounded-[10px] border border-[#E2E8F0] bg-white flex items-center">
            <span className="text-[13px] font-[700] text-[#0F172A] shrink-0 mr-1.5">Nombre:</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="🏡 Entrada Departamento"
              className="w-full text-[13px] font-[700] text-[#0F172A] bg-transparent focus:outline-none"
            />
          </div>

          {/* Field 2: Target Amount (InGMntW) */}
          <div className="h-[44px] px-3.5 rounded-[10px] border border-[#E2E8F0] bg-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-[13px] font-[800] text-[#0F172A] shrink-0">Monto Meta:</span>
              <input
                type="number"
                step="any"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full text-[13px] font-[800] text-[#0F172A] font-mono bg-transparent focus:outline-none"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="text-[11px] font-bold text-[#0F172A] bg-slate-100 rounded px-1.5 py-0.5"
              >
                <option value="USDT">USDT</option>
                <option value="USD">USD</option>
                <option value="BOB">BOB</option>
              </select>
            </div>
            {isCrypto && (
              <span className="text-[11px] font-[600] text-[#166534] font-mono shrink-0">
                ≈ Bs. {bobEquivalent}
              </span>
            )}
          </div>

          {/* Field 3: Savings Account (InGAccW) */}
          <div className="h-[44px] px-3.5 rounded-[10px] border border-[#E2E8F0] bg-white flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[12px] font-[600] text-[#0F172A]">
              <span>Cuenta Ahorro:</span>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="bg-transparent font-bold text-[#0F172A] focus:outline-none cursor-pointer"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] font-[700] text-[#2563EB]">Cambiar</span>
          </div>

          {/* Field 4: Target Date (InGDateW) */}
          <div className="h-[44px] px-3.5 rounded-[10px] border border-[#E2E8F0] bg-white flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[12px] font-[600] text-[#0F172A] flex-1">
              <span>Fecha Límite:</span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-transparent font-bold text-[#0F172A] focus:outline-none"
              />
            </div>
            <Calendar className="w-[14px] h-[14px] text-[#64748B] shrink-0" />
          </div>

          {/* Projection Card (OpenPencil ProjCardW) */}
          <div className="p-3 rounded-[12px] bg-[#EFF6FF] border border-[#BFDBFE] flex flex-col gap-1">
            <div className="text-[12px] font-[800] text-[#1D4ED8]">
              Proyección: {monthlyProjection} {currency} / mes (≈ Bs. {monthlyBob}/mes)
            </div>
            <div className="text-[10px] font-[500] text-[#475569]">
              Impacto: Representa el 28% de tu capacidad de ahorro proyectada en Billefy.
            </div>
          </div>

          {/* Submit Button (OpenPencil BtnCrearGW) */}
          <button
            type="submit"
            disabled={submitting || targetNum <= 0}
            className="w-full h-[46px] rounded-[12px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-[13px] font-[800] transition flex items-center justify-center shadow-sm disabled:opacity-50"
          >
            Crear Objetivo Financiero (1-Clic)
          </button>
        </form>
      </div>
    </div>
  );
}
