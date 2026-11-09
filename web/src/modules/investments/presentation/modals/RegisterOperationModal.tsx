"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShoppingCart,
  TrendingDown,
  Coins,
  Zap,
  RefreshCw,
  ArrowDownUp,
  SlidersHorizontal,
} from "lucide-react";
import { Investment } from "../../domain/investment.types";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { normalizeAmountString } from "@/shared/lib/keypad";
import {
  extractCryptoSymbol,
  fetchCryptoTicker,
  calculateCryptoQuantityFromUsdt,
  calculateCryptoUsdtValue,
} from "../../domain/binance-market.service";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/ui/form-field";
import { cn } from "@/shared/lib/utils";

interface RegisterOperationModalProps {
  investment: Investment | null;
  accounts: AccountDto[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmOperation: (params: {
    investmentId: string;
    type: "buy" | "sell" | "dividend";
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    fees: number;
    date: string;
    notes?: string;
    linkedAccountId?: string;
  }) => Promise<void>;
  currencySymbol?: string;
}

const FORM_ID = "register-operation-form";

const QUICK_BUY_AMOUNTS = [50, 100, 250, 500, 1000];

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
  const [type, setType] = useState<"buy" | "sell" | "dividend">("buy");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [quantityStr, setQuantityStr] = useState("");
  const [dollarAmountStr, setDollarAmountStr] = useState("");
  const [unitPriceStr, setUnitPriceStr] = useState("");
  const [feesStr, setFeesStr] = useState("0");
  const [notes, setNotes] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [liveCryptoPrice, setLiveCryptoPrice] = useState<number | null>(null);
  const [priceChangePercent, setPriceChangePercent] = useState<number | null>(null);
  const [loadingLivePrice, setLoadingLivePrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cryptoSymbol = useMemo(() => {
    if (!investment) return "";
    return extractCryptoSymbol(investment) || (investment.kind === "crypto" ? "monedas" : "unidades");
  }, [investment]);

  const valuationCurrency = investment?.currency || "USDT";

  // Fetch live market price from Binance Spot
  const loadMarketPrice = useCallback(async (symbol: string) => {
    setLoadingLivePrice(true);
    try {
      const ticker = await fetchCryptoTicker(symbol);
      if (ticker && ticker.price > 0) {
        setLiveCryptoPrice(ticker.price);
        setPriceChangePercent(ticker.priceChangePercent);
        setUnitPriceStr(String(ticker.price));
        return ticker.price;
      }
    } finally {
      setLoadingLivePrice(false);
    }
    return null;
  }, []);

  // Initialize form state when opening
  useEffect(() => {
    if (!investment || !isOpen) return;

    setDate(new Date().toISOString().split("T")[0]);
    setQuantityStr("");
    setDollarAmountStr("");
    setFeesStr("0");
    setLinkedAccountId("");
    setType("buy");
    setShowAdvanced(false);

    const symbol = extractCryptoSymbol(investment);
    if (symbol) {
      void loadMarketPrice(symbol);
    } else {
      if (investment.quantity > 0 && investment.currentValue > 0) {
        const implied = Number((investment.currentValue / investment.quantity).toFixed(2));
        setUnitPriceStr(String(implied));
      } else {
        setUnitPriceStr("");
      }
      setLiveCryptoPrice(null);
      setPriceChangePercent(null);
    }
  }, [investment, isOpen, loadMarketPrice]);

  if (!isOpen || !investment) return null;

  const isDividend = type === "dividend";
  const isBuy = type === "buy";
  const isSell = type === "sell";

  const currentPrice = toNumber(unitPriceStr) || liveCryptoPrice || 0;
  const qty = toNumber(quantityStr);
  const fees = toNumber(feesStr);
  const dollarAmount = toNumber(dollarAmountStr);

  const grossFromQty = currentPrice > 0 ? calculateCryptoUsdtValue(qty, currentPrice) : 0;
  const derivedTotal = isBuy ? grossFromQty + fees : Math.max(0, grossFromQty - fees);
  const finalTotalAmount = dollarAmount > 0 ? dollarAmount : Number(derivedTotal.toFixed(2));

  const valid = isDividend
    ? dollarAmount > 0
    : qty > 0 && currentPrice > 0 && finalTotalAmount > 0;

  // 1. User types in Dollar amount -> Calculate quantity
  const handleDollarAmountChange = (rawDollars: string) => {
    setDollarAmountStr(rawDollars);
    const dollars = toNumber(rawDollars);
    const price = currentPrice;

    if (dollars > 0 && price > 0) {
      const gross = type === "buy" ? Math.max(0, dollars - fees) : dollars + fees;
      const computedQty = calculateCryptoQuantityFromUsdt(gross, price, 8);
      setQuantityStr(String(computedQty));
    } else if (rawDollars.trim() === "") {
      setQuantityStr("");
    }
  };

  // 2. User types in Quantity -> Calculate dollar amount
  const handleQuantityChange = (rawQty: string) => {
    setQuantityStr(rawQty);
    const q = toNumber(rawQty);
    const price = currentPrice;

    if (q > 0 && price > 0) {
      const gross = calculateCryptoUsdtValue(q, price);
      const tot = type === "buy" ? gross + fees : Math.max(0, gross - fees);
      setDollarAmountStr(String(Number(tot.toFixed(2))));
    } else if (rawQty.trim() === "") {
      setDollarAmountStr("");
    }
  };

  // 3. User customizes unit price -> Recalculate quantity or dollar amount
  const handleUnitPriceChange = (rawPrice: string) => {
    setUnitPriceStr(rawPrice);
    const price = toNumber(rawPrice);
    const dollars = toNumber(dollarAmountStr);
    const q = toNumber(quantityStr);

    if (dollars > 0 && price > 0) {
      const gross = type === "buy" ? Math.max(0, dollars - fees) : dollars + fees;
      const computedQty = calculateCryptoQuantityFromUsdt(gross, price, 8);
      setQuantityStr(String(computedQty));
    } else if (q > 0 && price > 0) {
      const gross = calculateCryptoUsdtValue(q, price);
      const tot = type === "buy" ? gross + fees : Math.max(0, gross - fees);
      setDollarAmountStr(String(Number(tot.toFixed(2))));
    }
  };

  // 4. User changes fees -> Recalculate total
  const handleFeesChange = (rawFees: string) => {
    setFeesStr(rawFees);
    const f = toNumber(rawFees);
    const q = toNumber(quantityStr);
    const price = currentPrice;

    if (q > 0 && price > 0) {
      const gross = calculateCryptoUsdtValue(q, price);
      const tot = type === "buy" ? gross + f : Math.max(0, gross - f);
      setDollarAmountStr(String(Number(tot.toFixed(2))));
    }
  };

  // 5. User changes operation type
  const handleTypeChange = (nextType: "buy" | "sell" | "dividend") => {
    setType(nextType);
    if (nextType === "dividend") return;
    const q = toNumber(quantityStr);
    const price = currentPrice;

    if (q > 0 && price > 0) {
      const gross = calculateCryptoUsdtValue(q, price);
      const tot = nextType === "buy" ? gross + fees : Math.max(0, gross - fees);
      setDollarAmountStr(String(Number(tot.toFixed(2))));
    }
  };

  // Quick chips
  const handleQuickAddDollar = (amount: number) => {
    const current = toNumber(dollarAmountStr);
    handleDollarAmountChange(String(current + amount));
  };

  const handleSellAll = () => {
    if (investment.quantity > 0) {
      handleQuantityChange(String(investment.quantity));
    }
  };

  const handleApplyLivePrice = () => {
    if (liveCryptoPrice && liveCryptoPrice > 0) {
      handleUnitPriceChange(String(liveCryptoPrice));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    setSubmitting(true);
    try {
      await onConfirmOperation({
        investmentId: investment.id,
        type,
        quantity: isDividend ? 0 : qty,
        unitPrice: isDividend ? 0 : currentPrice,
        totalAmount: isDividend ? dollarAmount : finalTotalAmount,
        fees,
        date: new Date(date).toISOString(),
        notes: notes.trim() || undefined,
        linkedAccountId: linkedAccountId || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={
        isDividend
          ? investment.kind === "realestate"
            ? `Cobro de renta: ${investment.name}`
            : `Cobro de dividendo: ${investment.name}`
          : isBuy
          ? `Comprar ${cryptoSymbol || investment.name}`
          : `Vender ${cryptoSymbol || investment.name}`
      }
      description={
        isDividend
          ? "Registrá el ingreso de dinero líquido recibido sin alterar la tenencia de tu activo."
          : isBuy
          ? "Ingresá los dólares a invertir o la cantidad de títulos calculados con la cotización."
          : "Ingresá la cantidad a vender o el monto a recibir calculado con el precio de mercado."
      }
      size="md"
      footer={
        <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={!valid || submitting}
            loading={submitting}
            className={cn(
              "w-full sm:w-auto font-bold text-white transition-all shadow-md",
              isDividend
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                : isBuy
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
            )}
          >
            {isDividend
              ? investment.kind === "realestate"
                ? "Confirmar cobro de renta"
                : "Confirmar cobro de dividendo"
              : isBuy
              ? `Confirmar compra de ${cryptoSymbol || "activo"}`
              : `Confirmar venta de ${cryptoSymbol || "activo"}`}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 py-1 text-xs">
        {/* 1. Operation Switcher */}
        <div
          className={cn(
            "grid gap-1.5 p-1 rounded-2xl bg-muted/60 border border-border",
            investment.kind !== "crypto" ? "grid-cols-3" : "grid-cols-2"
          )}
        >
          <button
            type="button"
            onClick={() => handleTypeChange("buy")}
            className={cn(
              "h-10 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              isBuy
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Comprar</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("sell")}
            className={cn(
              "h-10 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              isSell
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Vender</span>
          </button>
          {investment.kind !== "crypto" && (
            <button
              type="button"
              onClick={() => handleTypeChange("dividend")}
              className={cn(
                "h-10 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                isDividend
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Coins className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{investment.kind === "realestate" ? "Renta" : "Dividendo"}</span>
            </button>
          )}
        </div>

        {/* 2. Dividend / Rent Specific Form View */}
        {isDividend ? (
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  {investment.kind === "realestate"
                    ? "Monto cobrado por alquiler / renta"
                    : "Monto cobrado en dividendos"}
                </label>
                <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">
                  {valuationCurrency}
                </span>
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-muted-foreground font-mono font-bold text-base pointer-events-none">
                  {currencySymbol}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={dollarAmountStr}
                  onChange={(e) => setDollarAmountStr(e.target.value)}
                  placeholder="250.00"
                  className="pl-8 h-12 text-base font-mono font-extrabold bg-muted/30 focus:bg-background"
                  autoFocus
                />
              </div>

              <span className="text-[11px] text-muted-foreground">
                Este cobro se registra como dividendo/renta sin modificar la cantidad de títulos o metros cuadrados en cartera.
              </span>
            </div>

            {/* Account to credit */}
            {accounts.length > 0 && (
              <FormField label="Acreditar dinero en cuenta bancaria / billetera">
                {() => (
                  <select
                    value={linkedAccountId}
                    onChange={(e) => setLinkedAccountId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-semibold outline-none focus:border-amber-500 transition cursor-pointer"
                  >
                    <option value="">No acreditar en cuentas de efectivo</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            )}

            {/* Notes */}
            <FormField label="Notas o período del cobro (opcional)">
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    investment.kind === "realestate"
                      ? "Ej. Renta Noviembre 2026"
                      : "Ej. Dividendo trimestral Q3"
                  }
                  className="text-xs"
                />
              )}
            </FormField>

            {/* Date */}
            <FormField label="Fecha de cobro">
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="font-mono text-xs"
                />
              )}
            </FormField>
          </div>
        ) : (
          <>
            {/* Live Market Price Card for Crypto */}
            {investment.kind === "crypto" && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-muted/60 via-muted/40 to-muted/20 border border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black text-sm flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-foreground text-sm truncate">
                        {investment.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Binance Spot
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Cotización en tiempo real usada para las conversiones
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1.5">
                    {loadingLivePrice ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="font-mono font-black text-base text-foreground tracking-tight">
                        $ {liveCryptoPrice ? liveCryptoPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "..."}
                      </span>
                    )}
                    {cryptoSymbol && (
                      <button
                        type="button"
                        onClick={() => loadMarketPrice(cryptoSymbol)}
                        title="Refrescar cotización"
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
                      >
                        <RefreshCw className={cn("w-3 h-3", loadingLivePrice && "animate-spin")} />
                      </button>
                    )}
                  </div>
                  {priceChangePercent !== null && (
                    <span
                      className={cn(
                        "text-[10px] font-bold",
                        priceChangePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {priceChangePercent >= 0 ? "+" : ""}
                      {priceChangePercent.toFixed(2)}% (24h)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Non-crypto asset ticker header */}
            {investment.kind !== "crypto" && investment.ticker && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    {investment.ticker}
                  </span>
                  <span className="font-bold text-foreground text-xs">{investment.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  Tenencia: {investment.quantity} {cryptoSymbol}
                </span>
              </div>
            )}

            {/* DUAL CONVERSION INPUTS */}
            <div className="flex flex-col gap-3">
              {/* Input A: Monto en Dólares */}
              <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    {isBuy ? "Monto que vas a pagar" : "Monto en dólares que vas a recibir"}
                  </label>
                  <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">
                    {valuationCurrency}
                  </span>
                </div>

                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-muted-foreground font-mono font-bold text-base pointer-events-none">
                    {currencySymbol}
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={dollarAmountStr}
                    onChange={(e) => handleDollarAmountChange(e.target.value)}
                    placeholder="100.00"
                    className="pl-8 h-12 text-base font-mono font-extrabold bg-muted/30 focus:bg-background"
                    autoFocus={isBuy}
                  />
                </div>

                {/* Quick Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                    {isBuy ? "Sugeridos:" : "Rápido:"}
                  </span>
                  {isBuy ? (
                    QUICK_BUY_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickAddDollar(amt)}
                        className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted border border-border/80 text-[11px] font-mono font-bold text-foreground transition cursor-pointer"
                      >
                        +${amt}
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={handleSellAll}
                      disabled={investment.quantity <= 0}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[11px] font-bold text-rose-300 transition cursor-pointer"
                    >
                      Vender todo ({investment.quantity} {cryptoSymbol})
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Converter Bridge */}
              <div className="flex items-center justify-center -my-1 z-10">
                <div className="px-3 py-1 rounded-full bg-muted border border-border shadow-2xs flex items-center gap-1.5 text-[11px] font-bold text-purple-400">
                  <ArrowDownUp className="w-3 h-3 text-purple-400" />
                  <span>Conversión bidireccional automática</span>
                </div>
              </div>

              {/* Input B: Cantidad de Activo */}
              <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    {isBuy ? `Cantidad de ${cryptoSymbol} comprada` : `Cantidad de ${cryptoSymbol} a vender`}
                  </label>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-mono font-extrabold uppercase">
                    {cryptoSymbol}
                  </span>
                </div>

                <div className="relative flex items-center">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={quantityStr}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="0.001317"
                    className="h-12 text-base font-mono font-extrabold bg-muted/30 focus:bg-background"
                    autoFocus={!isBuy}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                  <span>
                    {isBuy
                      ? "Calculado dividiendo el monto por el precio unitario"
                      : `Disponible en cartera: ${investment.quantity} ${cryptoSymbol}`}
                  </span>
                  {!isBuy && investment.quantity > 0 && (
                    <button
                      type="button"
                      onClick={handleSellAll}
                      className="text-purple-400 font-bold hover:underline cursor-pointer"
                    >
                      Usar máximo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Advanced / Custom Price Options (Collapsible) */}
            <div className="border border-border/70 rounded-2xl overflow-hidden bg-card/60">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-3 flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                  <span>Ajustar precio unitario, comisiones, notas o cuenta</span>
                </div>
                <span className="text-[11px] text-purple-400">
                  {showAdvanced ? "Ocultar" : "Personalizar"}
                </span>
              </button>

              {showAdvanced && (
                <div className="p-3.5 border-t border-border/70 flex flex-col gap-3.5 bg-muted/20 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Unit Price Input */}
                    <FormField label={`Precio unitario (${valuationCurrency})`}>
                      {(control) => (
                        <div className="relative flex items-center">
                          <Input
                            {...control}
                            type="text"
                            inputMode="decimal"
                            value={unitPriceStr}
                            onChange={(e) => handleUnitPriceChange(e.target.value)}
                            placeholder="76,000.00"
                            className="font-mono text-xs font-bold"
                          />
                          {liveCryptoPrice && currentPrice !== liveCryptoPrice && (
                            <button
                              type="button"
                              onClick={handleApplyLivePrice}
                              className="absolute right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            >
                              Restaurar en vivo
                            </button>
                          )}
                        </div>
                      )}
                    </FormField>

                    {/* Fees Input */}
                    <FormField label={`Comisiones / Tarifa (${currencySymbol})`}>
                      {(control) => (
                        <Input
                          {...control}
                          type="text"
                          inputMode="decimal"
                          value={feesStr}
                          onChange={(e) => handleFeesChange(e.target.value)}
                          placeholder="0.00"
                          className="font-mono text-xs"
                        />
                      )}
                    </FormField>
                  </div>

                  {/* Notes */}
                  <FormField label="Notas de la operación (opcional)">
                    {(control) => (
                      <Input
                        {...control}
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ej. Compra escalonada DCA"
                        className="text-xs"
                      />
                    )}
                  </FormField>

                  {/* Linked Cash Account */}
                  {accounts.length > 0 && (
                    <FormField label="Pagar o recibir con cuenta bancaria/wallet (opcional)">
                      {() => (
                        <select
                          value={linkedAccountId}
                          onChange={(e) => setLinkedAccountId(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-semibold outline-none focus:border-purple-500 transition cursor-pointer"
                        >
                          <option value="">No vincular con cuentas de efectivo</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({acc.currency})
                            </option>
                          ))}
                        </select>
                      )}
                    </FormField>
                  )}

                  {/* Date */}
                  <FormField label="Fecha de la operación">
                    {(control) => (
                      <Input
                        {...control}
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="font-mono text-xs"
                      />
                    )}
                  </FormField>
                </div>
              )}
            </div>

            {/* Live Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isBuy ? "Total a desembolsar:" : "Total a recibir:"}
                </span>
                <span className="text-base font-black font-mono text-foreground">
                  {currencySymbol} {finalTotalAmount > 0 ? finalTotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"} {valuationCurrency}
                </span>
              </div>

              <div className="text-right flex flex-col items-end">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isBuy ? "Vas a recibir:" : "Vas a entregar:"}
                </span>
                <span className="text-sm font-mono font-extrabold text-primary">
                  {qty > 0 ? qty : "0"} {cryptoSymbol}
                </span>
              </div>
            </div>
          </>
        )}
      </form>
    </ResponsiveDrawer>
  );
}
