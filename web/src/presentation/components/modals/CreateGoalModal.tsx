"use client";

import React, { useState } from "react";
import { AccountDto, CreateGoalRequest } from "@/domain/models/types";
import { X, Check, Calendar } from "lucide-react";

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
  const [targetDate, setTargetDate] = useState("2026-12-31");
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
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 lg:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Crear Nuevo Objetivo Financiero
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input 1: Nombre */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Nombre del Objetivo
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. 🏡 Entrada Departamento"
              className="w-full font-bold text-sm text-slate-900 bg-transparent focus:outline-none"
            />
          </div>

          {/* Input 2: Monto Meta + Moneda */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Monto Meta ({currency})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  required
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full font-bold text-lg text-slate-900 font-mono bg-transparent focus:outline-none"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1"
                >
                  <option value="USDT">USDT</option>
                  <option value="USD">USD</option>
                  <option value="BOB">BOB</option>
                </select>
              </div>
            </div>

            {isCrypto && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full whitespace-nowrap font-mono self-end">
                ≈ Bs. {bobEquivalent}
              </span>
            )}
          </div>

          {/* Input 3: Cuenta Ahorro */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Cuenta de Ahorro / Destino
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full font-bold text-sm text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Input 4: Fecha Límite */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Fecha Límite (Horizonte)
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="font-bold text-sm text-slate-900 bg-transparent focus:outline-none"
              />
            </div>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>

          {/* Projection Box (OpenPencil 07) */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1">
            <div className="text-sm font-bold text-blue-900">
              Proyección: {monthlyProjection} {currency} / mes (≈ Bs. {monthlyBob}/mes)
            </div>
            <p className="text-xs text-blue-700">
              Impacto: Representa el 28% de tu capacidad de ahorro proyectada en Billefy.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{submitting ? "Creando..." : "Crear Objetivo Financiero (1-Clic)"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
