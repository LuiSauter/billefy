"use client";

import React, { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Investment } from "../../domain/investment.types";
import { normalizeAmountString } from "@/shared/lib/keypad";

interface UpdatePriceModalProps {
  investment: Investment | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateValue: (id: string, newValue: number, newQuantity?: number) => Promise<void>;
  currencySymbol?: string;
}

function toNumber(raw: string): number {
  const n = parseFloat(normalizeAmountString(raw.trim()) || "0");
  return Number.isFinite(n) ? n : 0;
}

export function UpdatePriceModal({
  investment,
  isOpen,
  onClose,
  onUpdateValue,
  currencySymbol = "$",
}: UpdatePriceModalProps) {
  const [mode, setMode] = useState<"unitPrice" | "totalValue">("unitPrice");
  const [unitPriceStr, setUnitPriceStr] = useState("");
  const [totalValueStr, setTotalValueStr] = useState("");
  const [quantityStr, setQuantityStr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (investment && isOpen) {
      const qty = investment.quantity > 0 ? investment.quantity : 1;
      const initialUnitPrice = investment.currentValue / qty;
      setQuantityStr(String(investment.quantity));
      setUnitPriceStr(initialUnitPrice.toFixed(2));
      setTotalValueStr(String(investment.currentValue));
      setMode("unitPrice");
    }
  }, [investment, isOpen]);

  if (!isOpen || !investment) return null;

  const currentVal = investment.currentValue || 0;
  const qty = toNumber(quantityStr) || investment.quantity || 1;

  // Real-time calculations depending on active input mode
  let computedTotal = 0;
  let computedUnitPrice = 0;

  if (mode === "unitPrice") {
    computedUnitPrice = toNumber(unitPriceStr);
    computedTotal = Number((computedUnitPrice * qty).toFixed(2));
  } else {
    computedTotal = toNumber(totalValueStr);
    computedUnitPrice = qty > 0 ? Number((computedTotal / qty).toFixed(2)) : 0;
  }

  const diffNominal = computedTotal - currentVal;
  const diffPct = currentVal > 0 ? (diffNominal / currentVal) * 100 : 0;
  const isPositive = diffNominal >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (computedTotal <= 0) return;

    setSubmitting(true);
    try {
      await onUpdateValue(investment.id, computedTotal, toNumber(quantityStr) || undefined);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Actualizar precio / valuación
              </h2>
              <p className="text-xs text-muted-foreground">{investment.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-muted/60 p-1 border border-border/70">
            <button
              type="button"
              onClick={() => {
                setMode("unitPrice");
                setUnitPriceStr(computedUnitPrice > 0 ? String(computedUnitPrice) : "");
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                mode === "unitPrice"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Por precio unitario
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("totalValue");
                setTotalValueStr(computedTotal > 0 ? String(computedTotal) : "");
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                mode === "totalValue"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Por valor total
            </button>
          </div>

          {/* Unit Price Field */}
          {mode === "unitPrice" ? (
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">
                Nuevo precio unitario ({currencySymbol} por unidad)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground font-mono font-bold">
                  {currencySymbol}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={unitPriceStr}
                  onChange={(e) => setUnitPriceStr(e.target.value)}
                  placeholder="65,000.00"
                  className="w-full h-10 pl-8 pr-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono font-bold text-sm outline-none focus:border-purple-500 transition"
                  autoFocus
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                Valor total resultante:{" "}
                <strong className="text-foreground font-mono">
                  {currencySymbol} {computedTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">
                Nuevo valor total de la posición ({currencySymbol})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground font-mono font-bold">
                  {currencySymbol}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={totalValueStr}
                  onChange={(e) => setTotalValueStr(e.target.value)}
                  placeholder="28,500.00"
                  className="w-full h-10 pl-8 pr-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono font-bold text-sm outline-none focus:border-purple-500 transition"
                  autoFocus
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                Precio unitario resultante:{" "}
                <strong className="text-foreground font-mono">
                  {currencySymbol} {computedUnitPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </span>
            </div>
          )}

          {/* Quantity */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-foreground">
              Cantidad de unidades ({investment.currency})
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={quantityStr}
              onChange={(e) => setQuantityStr(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono text-sm outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Real-time Preview Banner */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-muted-foreground font-semibold">
                Variación frente al valor anterior
              </span>
              <span className="font-mono text-xs text-foreground mt-0.5">
                {currentVal.toLocaleString("en-US", { minimumFractionDigits: 2 })} →{" "}
                <strong>{computedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                isPositive
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span>
                {isPositive ? "+" : ""}{diffPct.toFixed(2)}%
              </span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/70 mt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-10 px-4 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={computedTotal <= 0 || submitting}
              className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              {submitting ? "Guardando..." : "Guardar nuevo valor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
