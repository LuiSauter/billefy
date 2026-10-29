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
      <div className="w-full max-w-[540px] bg-white rounded-[24px] p-[24px_28px_28px_28px] shadow-2xl border border-border relative max-h-[90vh] overflow-y-auto flex flex-col gap-4">
        {/* Header (OpenPencil MBWHead) */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-black text-foreground tracking-tight">
              Nuevo Presupuesto Mensual
            </h2>
            <p className="text-sm font-medium text-muted-foreground mt-0.5">
              Configurá topes de gasto con alertas y sugerencias predictivas
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-muted-foreground hover:bg-slate-100 flex items-center justify-center transition"
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
              className={`flex-1 rounded-[8px] text-sm font-bold transition ${
                budgetType === "category"
                  ? "bg-white text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Por Categoría Específica
            </button>
            <button
              type="button"
              onClick={() => setBudgetType("global")}
              className={`flex-1 rounded-[8px] text-sm font-semibold transition ${
                budgetType === "global"
                  ? "bg-white text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Presupuesto Global Mensual
            </button>
          </div>

          {/* Category Chips (OpenPencil CatSecW) */}
          {budgetType === "category" && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-muted-foreground">
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
                      className={`h-[40px] px-2.5 rounded-[10px] border text-sm font-bold transition flex items-center gap-1.5 truncate ${
                        isSelected
                          ? "bg-blue-50 border-primary text-blue-700"
                          : "bg-white border-border text-foreground hover:bg-slate-50"
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
          <div className="p-3.5 rounded-[14px] bg-background border border-border flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">
              Límite Máximo Mensual ({currency})
            </label>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-[20px] font-black text-foreground">Bs.</span>
              <input
                type="number"
                step="any"
                required
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="0.00"
                className="w-full text-[24px] font-black text-foreground bg-transparent focus:outline-hidden placeholder-slate-300"
              />
            </div>
          </div>

          {/* Predictive insights when amount is typed */}
          {limitNum > 0 && (
            <div className="p-3 rounded-[12px] bg-green-50 border border-green-200 flex flex-col gap-1 text-xs font-semibold text-green-800">
              <div>• Disparo de Alerta temprana (80%): Bs. {alert80}</div>
              <div>• Ritmo de gasto seguro recomendado: Bs. {safeDaily} / día</div>
            </div>
          )}

          {/* Submit Button (OpenPencil BtnAddW) */}
          <button
            type="submit"
            disabled={submitting || limitNum <= 0}
            className="w-full h-[48px] rounded-[12px] bg-primary hover:bg-blue-700 active:scale-[0.99] text-white text-[15px] font-extrabold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            <Check className="w-[18px] h-[18px] stroke-[2.5]" />
            <span>{submitting ? "Creando..." : "Crear Presupuesto"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
