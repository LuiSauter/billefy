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
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currency, setCurrency] = useState("BOB");
  const [targetDate, setTargetDate] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const targetNum = parseFloat(targetAmount) || 0;
  const isCrypto = currency === "USDT" || currency === "USD";
  const bobEquivalent = isCrypto ? (targetNum * p2pRate).toFixed(2) : targetNum.toFixed(2);

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
      setName("");
      setTargetAmount("");
      setTargetDate("");
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
              placeholder="Ej. Fondo de emergencia, Departamento"
              className="w-full text-[13px] font-[700] text-[#0F172A] bg-transparent focus:outline-none placeholder-slate-400"
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
                placeholder="0.00"
                className="w-full text-[13px] font-[800] text-[#0F172A] font-mono bg-transparent focus:outline-none placeholder-slate-400"
              />
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="text-[12px] font-[800] text-[#2563EB] bg-slate-50 border border-slate-200 rounded-[8px] px-2 py-1 focus:outline-none shrink-0"
            >
              <option value="BOB">BOB (Bs.)</option>
              <option value="USD">USD ($)</option>
              <option value="USDT">USDT</option>
            </select>
          </div>

          {/* Field 3: Target Date (InGDateW) */}
          <div className="h-[44px] px-3.5 rounded-[10px] border border-[#E2E8F0] bg-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Calendar className="w-4 h-4 text-[#64748B] shrink-0" />
              <span className="text-[12px] font-[600] text-[#64748B] shrink-0">Fecha Límite:</span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full text-[13px] font-[700] text-[#0F172A] bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Field 4: Associated Account */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-[700] text-[#64748B]">
              Cuenta de Ahorro Asociada (Opcional)
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-[42px] px-3.5 rounded-[10px] border border-[#E2E8F0] text-[13px] font-[600] text-[#0F172A] bg-white focus:outline-none"
            >
              <option value="">Sin cuenta vinculada (Solo seguimiento)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Equiv Banner if Crypto */}
          {targetNum > 0 && isCrypto && (
            <div className="p-3 rounded-[12px] bg-[#EFF6FF] border border-[#DBEAFE] flex flex-col gap-0.5 text-[11px] text-[#1D4ED8] font-[600]">
              <span>≈ Bs. {bobEquivalent} (al cambio P2P de Bs. {p2pRate.toFixed(2)})</span>
            </div>
          )}

          {/* Submit Button (BtnGSaveW) */}
          <button
            type="submit"
            disabled={submitting || !name.trim() || targetNum <= 0}
            className="w-full h-[46px] rounded-[12px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-[13px] font-[800] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-1"
          >
            {submitting ? "Creando Objetivo..." : "Guardar Meta Financiera"}
          </button>
        </form>
      </div>
    </div>
  );
}
