"use client";

import React, { useState } from "react";
import { CreateBudgetRequest } from "@/domain/models/types";
import { X, Check, Lightbulb } from "lucide-react";

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: CreateBudgetRequest) => Promise<void>;
}

export function CreateBudgetModal({ isOpen, onClose, onSubmit }: CreateBudgetModalProps) {
  const [budgetType, setBudgetType] = useState<"category" | "global">("category");
  const [category, setCategory] = useState("Alimentos & Mercado");
  const [limit, setLimit] = useState("4000");
  const [currency, setCurrency] = useState("BOB");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const categories = [
    { label: "Alimentos & Mercado", emoji: "🍔" },
    { label: "Transporte & Gasolina", emoji: "🚗" },
    { label: "Vivienda", emoji: "🏠" },
    { label: "Ocio & Salidas", emoji: "🎉" },
    { label: "Salud & Farmacia", emoji: "💊" },
    { label: "Servicios", emoji: "💡" },
  ];

  const limitNum = parseFloat(limit) || 0;
  const alert80 = (limitNum * 0.8).toFixed(2);
  const safeDaily = (limitNum / 30).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(limitNum) || limitNum <= 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        limitAmount: limitNum,
        currency,
        alertThreshold: 0.8,
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
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Nuevo Presupuesto Mensual
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configurá topes de gasto con alertas y sugerencias predictivas
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Segmented Control */}
          <div className="p-1 rounded-xl bg-slate-100 flex gap-1">
            <button
              type="button"
              onClick={() => setBudgetType("category")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                budgetType === "category" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
              }`}
            >
              Por Categoría Específica
            </button>
            <button
              type="button"
              onClick={() => setBudgetType("global")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                budgetType === "global" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
              }`}
            >
              Presupuesto Global Mensual
            </button>
          </div>

          {/* Category Chips */}
          {budgetType === "category" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Categoría de Gasto
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((c) => {
                  const isSelected = category === c.label;
                  return (
                    <button
                      type="button"
                      key={c.label}
                      onClick={() => setCategory(c.label)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 text-blue-700 font-bold"
                          : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{c.emoji}</span>
                      <span className="truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Amount Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500">Límite de Gasto Máximo</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="BOB">Boliviano (BOB • Bs.)</option>
                <option value="USD">Dólar (USD • $)</option>
              </select>
            </div>

            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-sm font-bold text-slate-400">
                {currency === "BOB" ? "Bs." : "$"}
              </span>
              <input
                type="number"
                step="any"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full text-2xl font-extrabold text-slate-900 font-mono bg-transparent focus:outline-none"
                placeholder="4000.00"
                required
              />
            </div>

            {/* Smart Suggestion */}
            <div className="mt-3 p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="text-[11px] text-blue-900">
                  <strong>Sugerencia Billefy: Bs. 3,850.00 / mes</strong>
                  <p className="text-slate-500 text-[10px]">Promedio últimos 3 meses</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLimit("3850")}
                className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold"
              >
                Aplicar
              </button>
            </div>
          </div>

          {/* 50/30/20 Box */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
            <div className="flex items-center justify-between font-bold text-emerald-900 mb-0.5">
              <span>Clasificación: Necesidades Básicas (Regla 50/30/20)</span>
              <span className="text-emerald-700">22.2% del bloque</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Ritmo de consumo seguro estimado: Bs. {safeDaily} / día para 30 días de cobertura.
            </p>
          </div>

          {/* Alerts preview */}
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between font-medium text-amber-900">
              <span>⚠ Alerta preventiva al 80% (Bs. {alert80})</span>
              <span className="text-[11px] font-bold text-amber-700">Push + WhatsApp ✓</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between font-medium text-rose-900">
              <span>🚨 Alerta crítica al 100% (Tope Bs. {limitNum.toFixed(2)})</span>
              <span className="text-[11px] font-bold text-rose-700">Bloqueo activo ✓</span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{submitting ? "Guardando..." : "Guardar Presupuesto Mensual (1-Clic)"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
