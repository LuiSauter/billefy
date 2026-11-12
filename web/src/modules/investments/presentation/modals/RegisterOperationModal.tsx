"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Decimal from "decimal.js";
import {
  ShoppingCart,
  TrendingDown,
  Coins,
  Zap,
  TrendingUp,
  RefreshCw,
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
import { fetchStockQuote, StockQuote } from "../../domain/stock-market.service";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { FormField } from "@/shared/ui/form-field";
import { SelectField } from "@/shared/ui/select-field";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { Amount, Percentage, Quantity } from "@/shared/ui/amount";

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
  onFetchStockQuote?: (ticker: string) => Promise<StockQuote | null>;
  currency?: string;
}

const FORM_ID = "register-operation-form";
const QUICK_BUY_AMOUNTS = [50, 100, 250, 500, 1000];
// Preserve the existing input precision; rounding stays in the calculation handlers.
const MAX_INPUT_DECIMALS = Number.MAX_SAFE_INTEGER;

function toNumber(raw: string): number {
  const n = parseFloat(normalizeAmountString(raw.trim()) || "0");
  return Number.isFinite(n) ? n : 0;
}

function toDecimalString(value: number): string {
  return new Decimal(value).toFixed();
}

function LiveQuote({
  name,
  source,
  ticker,
  exchangeName,
  icon,
  price,
  changePercent,
  loading,
  currency,
  onRefresh,
}: {
  name: string;
  source: string;
  ticker?: string;
  exchangeName?: string | null;
  icon: React.ReactNode;
  price: number | null;
  changePercent: number | null;
  loading: boolean;
  currency: string;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-semibold text-foreground">{name}</span>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {ticker && <span>{ticker}</span>}
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-primary">{source}</span>
            {exchangeName && <span>{exchangeName}</span>}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <div className="flex items-center gap-1.5 text-base text-foreground">
          {loading ? (
            <RefreshCw className="size-4 animate-spin text-muted-foreground" />
          ) : price ? (
            <Amount value={price} currency={currency} size="inherit" tone="inherit" />
          ) : (
            <span>...</span>
          )}
          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onRefresh}
              title="Refrescar cotización"
              aria-label="Refrescar cotización"
            >
              <RefreshCw className={loading ? "animate-spin" : undefined} />
            </Button>
          )}
        </div>
        {changePercent !== null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Percentage value={changePercent} sign="always" size="inherit" tone="auto" />
            <span>(24h)</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function RegisterOperationModal({
  investment,
  accounts,
  isOpen,
  onClose,
  onConfirmOperation,
  onFetchStockQuote,
  currency = "USD",
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
  const [liveStockQuote, setLiveStockQuote] = useState<StockQuote | null>(null);
  const [priceChangePercent, setPriceChangePercent] = useState<number | null>(null);
  const [loadingLivePrice, setLoadingLivePrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cryptoSymbol = useMemo(() => {
    if (!investment) return "";
    return extractCryptoSymbol(investment) || (investment.kind === "crypto" ? "monedas" : "unidades");
  }, [investment]);

  // Fetch live market price from Binance Spot
  const loadMarketPrice = useCallback(async (symbol: string) => {
    setLoadingLivePrice(true);
    try {
      const ticker = await fetchCryptoTicker(symbol);
      if (ticker && ticker.price > 0) {
        setLiveCryptoPrice(ticker.price);
        setPriceChangePercent(ticker.priceChangePercent);
        setUnitPriceStr(toDecimalString(ticker.price));
        return ticker.price;
      }
    } finally {
      setLoadingLivePrice(false);
    }
    return null;
  }, []);

  // Fetch live stock quote from Yahoo Finance
  const loadStockMarketPrice = useCallback(async (sym: string) => {
    setLoadingLivePrice(true);
    try {
      const quote = onFetchStockQuote ? await onFetchStockQuote(sym) : await fetchStockQuote(sym);
      if (quote && quote.price > 0) {
        setLiveStockQuote(quote);
        setUnitPriceStr(toDecimalString(quote.price));
        setPriceChangePercent(quote.changePercent);
        return quote.price;
      }
    } finally {
      setLoadingLivePrice(false);
    }
    return null;
  }, [onFetchStockQuote]);

  // Initialize form state when opening
  useEffect(() => {
    if (!investment || !isOpen) return;

    setDate(new Date().toISOString().split("T")[0]);
    setQuantityStr("");
    setDollarAmountStr("");
    setFeesStr("0");
    setNotes("");
    setLinkedAccountId("");
    setType("buy");
    setShowAdvanced(false);

    const symbol = extractCryptoSymbol(investment);
    if (symbol) {
      void loadMarketPrice(symbol);
    } else if ((investment.kind === "stocks" || investment.kind === "funds") && investment.ticker) {
      void loadStockMarketPrice(investment.ticker);
    } else {
      if (investment.quantity > 0 && investment.currentValue > 0) {
        const implied = Number((investment.currentValue / investment.quantity).toFixed(2));
        setUnitPriceStr(toDecimalString(implied));
      } else {
        setUnitPriceStr("");
      }
      setLiveCryptoPrice(null);
      setLiveStockQuote(null);
      setPriceChangePercent(null);
    }
  }, [investment, isOpen, loadMarketPrice, loadStockMarketPrice]);

  if (!isOpen || !investment) return null;

  const isDividend = type === "dividend";
  const isBuy = type === "buy";

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
      setDollarAmountStr(toDecimalString(Number(tot.toFixed(2))));
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
      setDollarAmountStr(toDecimalString(Number(tot.toFixed(2))));
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
      setDollarAmountStr(toDecimalString(Number(tot.toFixed(2))));
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
      setDollarAmountStr(toDecimalString(Number(tot.toFixed(2))));
    }
  };

  // Quick chips
  const handleQuickAddDollar = (amount: number) => {
    const current = toNumber(dollarAmountStr);
    handleDollarAmountChange(toDecimalString(current + amount));
  };

  const handleSellAll = () => {
    if (investment.quantity > 0) {
      handleQuantityChange(String(investment.quantity));
    }
  };

  const handleApplyLivePrice = () => {
    const liveP = liveCryptoPrice || liveStockQuote?.price;
    if (liveP && liveP > 0) {
      handleUnitPriceChange(toDecimalString(liveP));
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

  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: `${account.name} (${account.currency})`,
  }));

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
      size="md"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={!valid || submitting}
            loading={submitting}
            variant={isDividend ? "default" : isBuy ? "success" : "destructive"}
            className="w-full sm:w-auto"
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
        <SegmentedControl
          aria-label="Tipo de operación"
          value={type}
          onChange={handleTypeChange}
          fullWidth
          options={[
            { value: "buy", label: <><ShoppingCart className="size-3.5" />Comprar</>, tone: "income" },
            { value: "sell", label: <><TrendingDown className="size-3.5" />Vender</>, tone: "expense" },
            ...(investment.kind !== "crypto" ? [{
              value: "dividend" as const,
              label: <><Coins className="size-3.5" />{investment.kind === "realestate" ? "Renta" : "Dividendo"}</>,
            }] : []),
          ]}
        />

        {isDividend ? (
          <div className="flex flex-col gap-3">
            <FormField label={investment.kind === "realestate" ? "Monto cobrado por alquiler / renta" : "Monto cobrado en dividendos"}>
              {(control) => (
                <MoneyInput
                  {...control}
                  value={dollarAmountStr}
                  onValueChange={setDollarAmountStr}
                  currency={currency}
                  maxDecimals={MAX_INPUT_DECIMALS}
                  placeholder="250.00"
                  autoFocus
                />
              )}
            </FormField>
            {accounts.length > 0 && (
              <FormField label="Acreditar dinero en cuenta bancaria / billetera">
                {(control) => (
                  <SelectField
                    {...control}
                    value={linkedAccountId}
                    onChange={(e) => setLinkedAccountId(e.target.value)}
                    options={[{ value: "", label: "No acreditar en cuentas de efectivo" }, ...accountOptions]}
                  />
                )}
              </FormField>
            )}
            <FormField label="Notas o período del cobro (opcional)">
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={investment.kind === "realestate" ? "Ej. Renta Noviembre 2026" : "Ej. Dividendo trimestral Q3"}
                />
              )}
            </FormField>
            <FormField label="Fecha de cobro">
              {(control) => <Input {...control} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
            </FormField>
          </div>
        ) : (
          <>
            {investment.kind === "crypto" && (
              <LiveQuote
                name={investment.name}
                source="Binance Spot"
                icon={<Zap className="size-5" />}
                price={liveCryptoPrice}
                changePercent={priceChangePercent}
                loading={loadingLivePrice}
                currency={currency}
                onRefresh={cryptoSymbol ? () => loadMarketPrice(cryptoSymbol) : undefined}
              />
            )}
            {(investment.kind === "stocks" || investment.kind === "funds") && investment.ticker && (
              <LiveQuote
                name={investment.name}
                source="Yahoo Finance"
                ticker={investment.ticker}
                exchangeName={liveStockQuote?.exchangeName}
                icon={<TrendingUp className="size-5" />}
                price={liveStockQuote?.price ?? null}
                changePercent={priceChangePercent}
                loading={loadingLivePrice}
                currency={currency}
                onRefresh={() => loadStockMarketPrice(investment.ticker!)}
              />
            )}

            <FormField label={isBuy ? "Monto que vas a pagar" : "Monto en dólares que vas a recibir"}>
              {(control) => (
                <MoneyInput
                  {...control}
                  value={dollarAmountStr}
                  onValueChange={handleDollarAmountChange}
                  currency={currency}
                  maxDecimals={MAX_INPUT_DECIMALS}
                  placeholder="100.00"
                  autoFocus={isBuy}
                />
              )}
            </FormField>
            <div className="flex flex-wrap items-center gap-1.5">
              {isBuy ? QUICK_BUY_AMOUNTS.map((amount) => (
                <Button key={amount} type="button" variant="outline" size="xs" onClick={() => handleQuickAddDollar(amount)}>
                  <Amount value={amount} currency={currency} sign="always" size="inherit" tone="inherit" />
                </Button>
              )) : (
                <Button type="button" variant="destructive" size="sm" onClick={handleSellAll} disabled={investment.quantity <= 0}>
                  Vender todo (<Quantity value={investment.quantity} unit={cryptoSymbol} size="inherit" />)
                </Button>
              )}
            </div>

            <FormField
              label={isBuy ? `Cantidad de ${cryptoSymbol} comprada` : `Cantidad de ${cryptoSymbol} a vender`}
              hint={!isBuy ? <>Disponible en cartera: <Quantity value={investment.quantity} unit={cryptoSymbol} size="inherit" /></> : undefined}
            >
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  inputMode="decimal"
                  value={quantityStr}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder="0.001317"
                  autoFocus={!isBuy}
                />
              )}
            </FormField>
            {!isBuy && investment.quantity > 0 && (
              <Button type="button" variant="link" size="sm" onClick={handleSellAll} className="self-end">
                Usar máximo
              </Button>
            )}

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                aria-expanded={showAdvanced}
                aria-controls="register-operation-advanced"
                className="h-auto w-full justify-start whitespace-normal p-3 text-left"
              >
                <SlidersHorizontal className="text-primary" />
                Ajustar precio unitario, comisiones, notas o cuenta
              </Button>
              {showAdvanced && (
                <div id="register-operation-advanced" className="flex flex-col gap-3.5 border-t border-border bg-muted/20 p-3.5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField label="Precio unitario">
                      {(control) => (
                        <MoneyInput
                          {...control}
                          value={unitPriceStr}
                          onValueChange={handleUnitPriceChange}
                          currency={currency}
                          maxDecimals={MAX_INPUT_DECIMALS}
                          placeholder="76000.00"
                        />
                      )}
                    </FormField>
                    <FormField label="Comisiones / Tarifa">
                      {(control) => (
                        <MoneyInput
                          {...control}
                          value={feesStr}
                          onValueChange={handleFeesChange}
                          currency={currency}
                          maxDecimals={MAX_INPUT_DECIMALS}
                          placeholder="0.00"
                        />
                      )}
                    </FormField>
                  </div>
                  {liveCryptoPrice && currentPrice !== liveCryptoPrice && (
                    <Button type="button" variant="outline" size="sm" onClick={handleApplyLivePrice} className="self-start">
                      Restaurar en vivo
                    </Button>
                  )}
                  <FormField label="Notas de la operación (opcional)">
                    {(control) => (
                      <Input {...control} type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Compra escalonada DCA" />
                    )}
                  </FormField>
                  {accounts.length > 0 && (
                    <FormField label="Pagar o recibir con cuenta bancaria/wallet (opcional)">
                      {(control) => (
                        <SelectField
                          {...control}
                          value={linkedAccountId}
                          onChange={(e) => setLinkedAccountId(e.target.value)}
                          options={[{ value: "", label: "No vincular con cuentas de efectivo" }, ...accountOptions]}
                        />
                      )}
                    </FormField>
                  )}
                  <FormField label="Fecha de la operación">
                    {(control) => <Input {...control} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
                  </FormField>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 p-3.5">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{isBuy ? "Total a desembolsar:" : "Total a recibir:"}</span>
                <Amount value={finalTotalAmount > 0 ? finalTotalAmount : 0} currency={currency} size="md" tone="inherit" />
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-xs text-muted-foreground">{isBuy ? "Vas a recibir:" : "Vas a entregar:"}</span>
                <Quantity value={qty > 0 ? qty : 0} unit={cryptoSymbol} size="sm" className="text-primary" />
              </div>
            </div>
          </>
        )}
      </form>
    </ResponsiveDrawer>
  );
}
