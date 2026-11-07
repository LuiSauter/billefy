"use client";

import React, { useState } from "react";
import { X, ShoppingCart, TrendingDown, Calendar, Wallet } from "lucide-react";
import { Investment } from "../../domain/investment.types";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { normalizeAmountString } from "@/shared/lib/keypad";

interface RegisterOperationModalProps {
  investment: Investment | null;
  accounts: AccountDto[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmOperation: (params: {
    investmentId: string;
    type: "buy" | "sell";
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    fees: number;
    date: string;
    linkedAccountId?: string;
  }) => Promise<void>;
  currencySymbol?: string;
}

function toNumber(raw: string): number {
  const n = parseFloat(normalizeAmountString(raw.trim()) || "0");
  return Number.isFinite(n) ? n : 0;
}

export function RegisterOperationModal({
  investment,
  accounts,
  isOpen,
  onClose,
  onConfirmOperation,
  currencySymbol = "$",
}: RegisterOperationModalProps) {
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [quantityStr, setQuantityStr] = useState("");
  const [unitPriceStr, setUnitPriceStr] = useState("");
  const [feesStr, setFeesStr] = useState("0");
  const [linkedAccountId, setLinkedAccountId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !investment) return null;

  const qty = toNumber(quantityStr);
  const unitPrice = toNumber(unitPriceStr);
  const fees = toNumber(feesStr);
  const totalAmount = Number((qty * unitPrice + (type === "buy" ? fees : -fees)).toFixed(2));

  const valid = qty > 0 && unitPrice > 0 && totalAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    setSubmitting(true);
    try {
      await onConfirmOperation({
        investmentId: investment.id,
        type,
        quantity: qty,
        unitPrice,
        totalAmount,
        fees,
        date: new Date(date).toISOString(),
        linkedAccountId: linkedAccountId || undefined,
      });
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
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Registrar operación
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
          {/* Operation Type Switcher */}
          <div className="flex rounded-xl bg-muted/60 p-1 border border-border/70">
            <button
              type="button"
              onClick={() => setType("buy")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                type === "buy"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Compra</span>
            </button>
            <button
              type="button"
              onClick={() => setType("sell")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                type === "sell"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Venta</span>
            </button>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Fecha de la operación</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono text-xs outline-none focus:border-purple-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Quantity */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">
                Cantidad ({investment.currency})
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={quantityStr}
                onChange={(e) => setQuantityStr(e.target.value)}
                placeholder="0.05"
                className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono font-bold text-sm outline-none focus:border-purple-500 transition"
                autoFocus
              />
            </div>

            {/* Unit Price */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">
                Precio unitario ({currencySymbol})
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={unitPriceStr}
                onChange={(e) => setUnitPriceStr(e.target.value)}
                placeholder="65,000.00"
                className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono font-bold text-sm outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          {/* Fees */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-foreground">
              Comisiones / Tarifa ({currencySymbol})
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={feesStr}
              onChange={(e) => setFeesStr(e.target.value)}
              placeholder="0.00"
              className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono text-xs outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Optional: Linked Account */}
          {accounts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Impactar en cuenta de banco/wallet (opcional)</span>
              </label>
              <select
                value={linkedAccountId}
                onChange={(e) => setLinkedAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground text-xs font-semibold outline-none focus:border-purple-500 transition"
              >
                <option value="">No vincular con cuentas de efectivo</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Total Amount Summary */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">
              Monto total de la {type === "buy" ? "compra" : "venta"}
            </span>
            <span className="text-base font-black font-mono text-foreground">
              {currencySymbol} {totalAmount > 0 ? totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
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
              disabled={!valid || submitting}
              className={`h-10 px-5 rounded-xl text-white text-xs font-bold transition shadow-lg cursor-pointer ${
                type === "buy"
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
              }`}
            >
              {submitting ? "Guardando..." : `Confirmar ${type === "buy" ? "compra" : "venta"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
