"use client";

import React, { useState } from "react";
import { CreateBudgetRequest } from "@/domain/models/types";
import { X, Check } from "lucide-react";

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: CreateBudgetRequest) => Promise<void>;
}

export function CreateBudgetModal({ isOpen, onClose, onSubmit }: CreateBudgetModalProps) {
  const [budgetType, setBudgetType] = useState<"category" | "global">("category");
  const [category, setCategory] = useState("Alimentos & Mercado");
  const [limit, setLimit] = useState("4000");
  const [currency] = useState("BOB");
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
      <div className="w-full max-w-[540px] bg-white rounded-[24px] p-[24px_28px_28px_28px] shadow-2xl border border-[#E2E8F0] relative max-h-[90vh] overflow-y-auto flex flex-col gap-4">
        {/* Header (OpenPencil MBWHead) */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-[900] text-[#0F172A] tracking-tight">
              Nuevo Presupuesto Mensual
            </h2>
            <p className="text-[12px] font-[500] text-[#64748B] mt-0.5">
              Configurá topes de gasto con alertas y sugerencias predictivas
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#64748B] hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Segmented Control (OpenPencil SegCtrlW) */}
          <div className="p-1 rounded-[10px] bg-slate-100 flex gap-1 h-[40px]">
            <button
              type="button"
              onClick={() => setBudgetType("category")}
              className={`flex-1 rounded-[8px] text-[12px] font-[700] transition ${
                budgetType === "category"
                  ? "bg-white text-[#0F172A] shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Por Categoría Específica
            </button>
            <button
              type="button"
              onClick={() => setBudgetType("global")}
              className={`flex-1 rounded-[8px] text-[12px] font-[600] transition ${
                budgetType === "global"
                  ? "bg-white text-[#0F172A] shadow-xs font-[700]"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Presupuesto Global Mensual
            </button>
          </div>

          {/* Category Chips (OpenPencil CatSecW) */}
          {budgetType === "category" && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-[700] text-[#475569]">
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
                      className={`h-[34px] px-2.5 rounded-[8px] text-[11px] flex items-center gap-1.5 border transition ${
                        isSelected
                          ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] font-[800]"
                          : "border-[#E2E8F0] bg-white text-[#475569] font-[600] hover:bg-slate-50"
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

          {/* Amount Box (OpenPencil AmtBoxW) */}
          <div className="p-3.5 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-[600] text-[#64748B]">
                Límite de Gasto Máximo
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#0F172A] text-white text-[11px] font-[800]">
                Boliviano (BOB • Bs.) ▼
              </span>
            </div>

            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-[20px] font-[900] text-[#0F172A]">Bs.</span>
              <input
                type="number"
                step="any"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="4000.00"
                className="w-full text-[28px] font-[900] text-[#0F172A] bg-transparent focus:outline-none"
              />
            </div>

            {/* Suggestion Card (OpenPencil SugCardW) */}
            <div className="p-2.5 rounded-[12px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-[800] text-[#1D4ED8]">
                  💡 Sugerencia Billefy: Bs. 3,850.00 / mes
                </div>
                <div className="text-[10px] font-[500] text-[#475569] truncate">
                  Calculada a partir del promedio de tus últimos 3 meses en Alimentos
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLimit("3850")}
                className="px-2 py-1 rounded-md bg-[#2563EB] hover:bg-blue-700 text-white text-[10px] font-[800] shrink-0"
              >
                Aplicar
              </button>
            </div>
          </div>

          {/* Rule 50/30/20 Box (OpenPencil RuleBoxW) */}
          <div className="p-3 rounded-[12px] bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-[700] text-[#166534]">
                Clasificación: Necesidades Básicas (Regla 50/30/20)
              </span>
              <span className="text-[11px] font-[800] text-[#15803D]">
                22.2% del bloque
              </span>
            </div>
            <p className="text-[11px] font-[500] text-[#15803D]">
              Ritmo de consumo seguro estimado: Bs. {safeDaily} / día para 30 días de cobertura
            </p>
          </div>

          {/* Thresholds and Alerts (OpenPencil AlSecW) */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-[700] text-[#475569]">
              Umbrales y Notificaciones Automáticas
            </span>
            <div className="p-2.5 rounded-[10px] bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
              <span className="text-[12px] font-[700] text-[#B45309]">
                ⚠️ Alerta preventiva al 80% (Bs. {alert80})
              </span>
              <span className="text-[11px] font-[800] text-[#D97706]">
                Push + Notificación WhatsApp ✓
              </span>
            </div>
            <div className="p-2.5 rounded-[10px] bg-rose-50/60 border border-rose-200/80 flex items-center justify-between">
              <span className="text-[12px] font-[700] text-[#B91C1C]">
                🚨 Alerta crítica al 100% (Tope Bs. {limitNum.toFixed(2)})
              </span>
              <span className="text-[11px] font-[800] text-[#DC2626]">
                Bloqueo preventivo activo ✓
              </span>
            </div>
          </div>

          {/* Submit Button (OpenPencil BtnSaveBW) */}
          <button
            type="submit"
            disabled={submitting || limitNum <= 0}
            className="w-full h-[48px] rounded-[12px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-[14px] font-[800] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-1"
          >
            <Check className="w-[18px] h-[18px] stroke-[2.5]" />
            <span>Guardar Presupuesto Mensual (1-Clic)</span>
          </button>
        </form>
      </div>
    </div>
  );
}
