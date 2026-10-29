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
  const [limit, setLimit] = useState("");
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
      setLimit("");
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
              <span className="text-[11px] font-[700] text-[#64748B]">
                Selecciona una Categoría:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const isSelected = category === cat.label;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setCategory(cat.label)}
                      className={`h-[40px] px-2.5 rounded-[10px] border text-[12px] font-[700] transition flex items-center gap-1.5 truncate ${
                        isSelected
                          ? "bg-blue-50 border-[#2563EB] text-[#1D4ED8]"
                          : "bg-white border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50"
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Field: Limit Amount (OpenPencil InMntW) */}
          <div className="p-3.5 rounded-[14px] bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-1">
            <label className="text-[11px] font-[700] text-[#475569]">
              Límite Máximo Mensual ({currency})
            </label>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-[20px] font-[900] text-[#0F172A]">Bs.</span>
              <input
                type="number"
                step="any"
                required
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="0.00"
                className="w-full text-[24px] font-[900] text-[#0F172A] bg-transparent focus:outline-none placeholder-slate-300"
              />
            </div>
          </div>

          {/* Predictive insights when amount is typed */}
          {limitNum > 0 && (
            <div className="p-3 rounded-[12px] bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col gap-1 text-[11px] font-[600] text-[#166534]">
              <div>• Disparo de Alerta temprana (80%): Bs. {alert80}</div>
              <div>• Ritmo de gasto seguro recomendado: Bs. {safeDaily} / día</div>
            </div>
          )}

          {/* Submit Button (OpenPencil BtnAddW) */}
          <button
            type="submit"
            disabled={submitting || limitNum <= 0}
            className="w-full h-[48px] rounded-[12px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-[14px] font-[800] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Check className="w-[18px] h-[18px] stroke-[2.5]" />
            <span>{submitting ? "Creando..." : "Crear Presupuesto"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
