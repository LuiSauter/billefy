"use client";

import React, { useState, useEffect } from "react";
import { X, ShoppingCart, TrendingDown, Calendar, Wallet, Zap, RefreshCw } from "lucide-react";
import Decimal from "decimal.js";
import { Investment } from "../../domain/investment.types";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { normalizeAmountString } from "@/shared/lib/keypad";
import { extractCryptoSymbol, fetchCryptoTicker } from "../../domain/binance-market.service";

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
  const [totalAmountStr, setTotalAmountStr] = useState("");
  const [feesStr, setFeesStr] = useState("0");
  const [linkedAccountId, setLinkedAccountId] = useState<string>("");
  const [liveCryptoPrice, setLiveCryptoPrice] = useState<number | null>(null);
  const [loadingLivePrice, setLoadingLivePrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Initialize and load default or live market unit price
  useEffect(() => {
    if (investment && isOpen) {
      setDate(new Date().toISOString().split("T")[0]);
      setQuantityStr("");
      setTotalAmountStr("");
      setFeesStr("0");
      setLinkedAccountId("");
      setType("buy");

      // Default unit price from current position
      if (investment.quantity > 0 && investment.currentValue > 0) {
        const impliedUnitPrice = Number((investment.currentValue / investment.quantity).toFixed(2));
        setUnitPriceStr(String(impliedUnitPrice));
      } else {
        setUnitPriceStr("");
      }

      // If crypto, fetch live market price
      const symbol = extractCryptoSymbol(investment);
      if (symbol) {
        setLoadingLivePrice(true);
        void fetchCryptoTicker(symbol)
          .then((ticker) => {
            if (ticker && ticker.price > 0) {
              setLiveCryptoPrice(ticker.price);
              // If unit price was empty, set it
              setUnitPriceStr((prev) => (prev ? prev : String(ticker.price)));
            }
          })
          .finally(() => setLoadingLivePrice(false));
      } else {
        setLiveCryptoPrice(null);
      }
    }
  }, [investment, isOpen]);

  if (!isOpen || !investment) return null;

  const qty = toNumber(quantityStr);
  const unitPrice = toNumber(unitPriceStr);
  const fees = toNumber(feesStr);
  const computedGross = new Decimal(qty > 0 ? qty : 0).times(new Decimal(unitPrice > 0 ? unitPrice : 0));
  const derivedTotal = type === "buy" ? computedGross.plus(fees) : Decimal.max(0, computedGross.minus(fees));
  const totalAmount = toNumber(totalAmountStr) || derivedTotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

  const valid = qty > 0 && unitPrice > 0 && totalAmount > 0;

  // Handlers for bidirectional conversion
  const handleQuantityChange = (newQtyStr: string) => {
    setQuantityStr(newQtyStr);
    const q = toNumber(newQtyStr);
    const p = toNumber(unitPriceStr);
    const f = toNumber(feesStr);

    if (q > 0 && p > 0) {
      const gross = new Decimal(q).times(new Decimal(p));
      const tot = type === "buy" ? gross.plus(f) : Decimal.max(0, gross.minus(f));
      setTotalAmountStr(tot.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString());
    } else if (newQtyStr.trim() === "") {
      setTotalAmountStr("");
    }
  };

  const handleUnitPriceChange = (newPriceStr: string) => {
    setUnitPriceStr(newPriceStr);
    const p = toNumber(newPriceStr);
    const q = toNumber(quantityStr);
    const tot = toNumber(totalAmountStr);
    const f = toNumber(feesStr);

    if (p > 0 && q > 0) {
      const gross = new Decimal(q).times(new Decimal(p));
      const newTot = type === "buy" ? gross.plus(f) : Decimal.max(0, gross.minus(f));
      setTotalAmountStr(newTot.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString());
    } else if (p > 0 && tot > 0 && q === 0) {
      const gross = type === "buy" ? Math.max(0, tot - f) : tot + f;
      const newQ = new Decimal(gross).div(new Decimal(p)).toDecimalPlaces(8, Decimal.ROUND_HALF_UP);
      setQuantityStr(newQ.toString());
    }
  };

  const handleTotalAmountChange = (newTotalStr: string) => {
    setTotalAmountStr(newTotalStr);
    const tot = toNumber(newTotalStr);
    const p = toNumber(unitPriceStr);
    const f = toNumber(feesStr);

    if (tot > 0 && p > 0) {
      const gross = type === "buy" ? Math.max(0, tot - f) : tot + f;
      const newQ = new Decimal(gross).div(new Decimal(p)).toDecimalPlaces(8, Decimal.ROUND_HALF_UP);
      setQuantityStr(newQ.toString());
    } else if (newTotalStr.trim() === "") {
      setQuantityStr("");
    }
  };

  const handleFeesChange = (newFeesStr: string) => {
    setFeesStr(newFeesStr);
    const f = toNumber(newFeesStr);
    const q = toNumber(quantityStr);
    const p = toNumber(unitPriceStr);

    if (q > 0 && p > 0) {
      const gross = new Decimal(q).times(new Decimal(p));
      const tot = type === "buy" ? gross.plus(f) : Decimal.max(0, gross.minus(f));
      setTotalAmountStr(tot.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString());
    }
  };

  const handleTypeChange = (newType: "buy" | "sell") => {
    setType(newType);
    const q = toNumber(quantityStr);
    const p = toNumber(unitPriceStr);
    const f = toNumber(feesStr);

    if (q > 0 && p > 0) {
      const gross = new Decimal(q).times(new Decimal(p));
      const tot = newType === "buy" ? gross.plus(f) : Decimal.max(0, gross.minus(f));
      setTotalAmountStr(tot.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString());
    }
  };

  const applyLivePrice = () => {
    if (!liveCryptoPrice) return;
    handleUnitPriceChange(String(liveCryptoPrice));
  };

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
              onClick={() => handleTypeChange("buy")}
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
              onClick={() => handleTypeChange("sell")}
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
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder="0.05"
                className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono font-bold text-sm outline-none focus:border-purple-500 transition"
                autoFocus
              />
            </div>

            {/* Unit Price */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground">
                  Precio unitario ({currencySymbol})
                </label>
                {liveCryptoPrice && (
                  <button
                    type="button"
                    onClick={applyLivePrice}
                    className="text-[10px] text-purple-400 font-bold flex items-center gap-1 hover:text-purple-300 transition cursor-pointer"
                    title="Usar cotización actual de mercado"
                  >
                    <Zap className="w-2.5 h-2.5 text-amber-400" />
                    <span>En vivo: ${liveCryptoPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </button>
                )}
                {loadingLivePrice && (
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-muted-foreground" />
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={unitPriceStr}
                onChange={(e) => handleUnitPriceChange(e.target.value)}
                placeholder="65,000.00"
                className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono font-bold text-sm outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          {/* Monto Total editable & Comisiones */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Amount Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground">
                  Monto total ({currencySymbol})
                </label>
                <span className="text-[10px] text-purple-400 font-semibold">
                  Bidireccional
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={totalAmountStr}
                onChange={(e) => handleTotalAmountChange(e.target.value)}
                placeholder="3,250.00"
                className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono font-bold text-sm outline-none focus:border-purple-500 transition"
              />
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
                onChange={(e) => handleFeesChange(e.target.value)}
                placeholder="0.00"
                className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono text-sm outline-none focus:border-purple-500 transition"
              />
            </div>
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
