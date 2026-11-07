"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Search, TrendingUp, TrendingDown, RefreshCw, Zap } from "lucide-react";
import {
  INVESTMENT_KINDS,
  InvestmentKind,
  CreateInvestmentInput,
} from "../../domain/investment.types";
import {
  CATEGORY_COLOR_LIST,
  CategoryColorKey,
  CategoryIconKey,
} from "@/modules/ledger/domain/category.types";
import { ACCOUNT_ICON_CHOICES } from "@/modules/ledger/domain/account-meta";
import { CategoryIcon } from "@/modules/ledger/presentation/CategoryIcon";
import { normalizeAmountString } from "@/shared/lib/keypad";
import {
  POPULAR_CRYPTOS,
  fetchCryptoTicker,
  calculateCryptoUsdtValue,
  CryptoTickerPrice,
  CryptoAssetMeta,
} from "../../domain/binance-market.service";

interface CreateInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateInvestmentInput) => Promise<void>;
  currencySymbol?: string;
}

const CURRENCY_CHOICES = ["USDT", "USD", "BOB", "EUR"];

const EXTENDED_ICONS: { key: CategoryIconKey; label: string }[] = [
  ...ACCOUNT_ICON_CHOICES,
  { key: "home" as CategoryIconKey, label: "Inmueble" },
  { key: "laptop" as CategoryIconKey, label: "Tecnología" },
  { key: "car" as CategoryIconKey, label: "Vehículo" },
  { key: "gift" as CategoryIconKey, label: "Colección" },
];

function toNumber(raw: string): number {
  const n = parseFloat(normalizeAmountString(raw.trim()) || "0");
  return Number.isFinite(n) ? n : 0;
}

export function CreateInvestmentModal({
  isOpen,
  onClose,
  onCreate,
  currencySymbol = "$",
}: CreateInvestmentModalProps) {
  void currencySymbol;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<InvestmentKind>("crypto");
  const [iconKey, setIconKey] = useState<CategoryIconKey>("coins");
  const [colorKey, setColorKey] = useState<CategoryColorKey>("amber");
  const [currency, setCurrency] = useState("USDT");
  const [quantity, setQuantity] = useState("");
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Crypto Specific State
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAssetMeta>(POPULAR_CRYPTOS[0]); // Default BTC
  const [cryptoSearch, setCryptoSearch] = useState("");
  const [liveTicker, setLiveTicker] = useState<CryptoTickerPrice | null>(null);
  const [loadingTicker, setLoadingTicker] = useState(false);

  // Fetch live price when crypto changes
  const loadTicker = useCallback(async (symbol: string) => {
    setLoadingTicker(true);
    try {
      const ticker = await fetchCryptoTicker(symbol);
      setLiveTicker(ticker);
      return ticker;
    } finally {
      setLoadingTicker(false);
    }
  }, []);

  // When picking crypto tab or crypto asset
  useEffect(() => {
    if (kind === "crypto" && isOpen) {
      void loadTicker(selectedCrypto.symbol);
    }
  }, [kind, selectedCrypto, isOpen, loadTicker]);

  // Recalculate estimated total value when quantity changes for crypto
  const handleQuantityChange = (rawQty: string) => {
    setQuantity(rawQty);
    if (kind === "crypto" && liveTicker && liveTicker.price > 0) {
      const qty = toNumber(rawQty);
      if (qty > 0) {
        const computed = calculateCryptoUsdtValue(qty, liveTicker.price);
        setValue(String(computed));
      }
    }
  };

  const selectCryptoAsset = async (crypto: CryptoAssetMeta) => {
    setSelectedCrypto(crypto);
    setName(`${crypto.name} (${crypto.symbol})`);
    setCurrency("USDT");
    setIconKey("coins");
    setColorKey("amber");

    const ticker = await loadTicker(crypto.symbol);
    if (ticker && ticker.price > 0) {
      const qty = toNumber(quantity);
      if (qty > 0) {
        setValue(String(calculateCryptoUsdtValue(qty, ticker.price)));
      }
    }
  };

  if (!isOpen) return null;

  const valid =
    name.trim().length > 0 && toNumber(value) > 0 && toNumber(quantity) > 0;

  const pickKind = (k: InvestmentKind) => {
    setKind(k);
    if (k === "crypto") {
      setName(`${selectedCrypto.name} (${selectedCrypto.symbol})`);
      setCurrency("USDT");
      void loadTicker(selectedCrypto.symbol);
    } else {
      setName("");
      setCurrency("USD");
      const def = INVESTMENT_KINDS.find((i) => i.value === k);
      if (def) {
        setIconKey(def.icon);
        setColorKey(def.color);
      }
    }
  };

  const filteredCryptos = POPULAR_CRYPTOS.filter(
    (c) =>
      c.symbol.toLowerCase().includes(cryptoSearch.toLowerCase()) ||
      c.name.toLowerCase().includes(cryptoSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    setSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        kind,
        iconKey,
        colorKey,
        currency,
        quantity: toNumber(quantity),
        currentValue: toNumber(value),
      });
      setName("");
      setQuantity("");
      setValue("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Registrar nueva inversión
              </h2>
              <p className="text-xs text-muted-foreground">
                {kind === "crypto"
                  ? "Selecciona tu criptomoneda y cotiza su valor en vivo desde Binance Spot."
                  : "Agregá un activo a tu portafolio; la variación se calcula sola al actualizar su valor."}
              </p>
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs overflow-y-auto">
          {/* Tipo de activo */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-foreground">Tipo de activo</label>
            <div className="flex flex-wrap gap-2">
              {INVESTMENT_KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => pickKind(k.value)}
                  className={`px-3 h-8 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    kind === k.value
                      ? "bg-purple-600/20 border-purple-500/60 text-purple-300 font-bold"
                      : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {/* Special Crypto Picker when kind === 'crypto' */}
          {kind === "crypto" ? (
            <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Seleccionar Criptomoneda</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Precios vía Binance Spot API
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={cryptoSearch}
                  onChange={(e) => setCryptoSearch(e.target.value)}
                  placeholder="Buscar Bitcoin, SOL, BNB, Ethereum..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg bg-card border border-border text-foreground text-xs outline-none focus:border-purple-500 transition"
                />
              </div>

              {/* Curated Coins Carousel / Grid */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {filteredCryptos.slice(0, 10).map((crypto) => {
                  const isSelected = selectedCrypto.symbol === crypto.symbol;
                  return (
                    <button
                      key={crypto.symbol}
                      type="button"
                      onClick={() => selectCryptoAsset(crypto)}
                      className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-500 shadow-xs"
                          : "bg-card border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="text-sm">{crypto.iconText}</span>
                      <span>{crypto.symbol}</span>
                    </button>
                  );
                })}
              </div>

              {/* Live Ticker Card from Binance */}
              <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xs"
                    style={{ backgroundColor: selectedCrypto.color }}
                  >
                    {selectedCrypto.iconText}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground text-xs">
                      {selectedCrypto.name} ({selectedCrypto.symbol})
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Par: {selectedCrypto.pair}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    {loadingTicker ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="font-mono font-bold text-sm text-foreground">
                        $ {liveTicker ? liveTicker.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "..."}
                      </span>
                    )}
                  </div>
                  {liveTicker && (
                    <span
                      className={`text-[10px] font-bold flex items-center gap-0.5 ${
                        liveTicker.priceChangePercent >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {liveTicker.priceChangePercent >= 0 ? (
                        <TrendingUp className="w-2.5 h-2.5" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5" />
                      )}
                      {liveTicker.priceChangePercent >= 0 ? "+" : ""}
                      {liveTicker.priceChangePercent.toFixed(2)}% (24h)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Standard Name Field for other investment kinds */
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">Nombre del activo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. ETF S&P 500, Depto. Alquiler, Bono del Tesoro"
                className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground text-sm font-semibold outline-none focus:border-purple-500 transition"
                autoFocus
              />
            </div>
          )}

          {/* Moneda */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-foreground">Moneda de valuación</label>
            <div className="grid grid-cols-4 gap-2">
              {CURRENCY_CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`h-9 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    currency === c
                      ? "bg-purple-600 text-white border-purple-500"
                      : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Cantidad */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">
                {kind === "crypto"
                  ? `Cantidad de monedas (${selectedCrypto.symbol})`
                  : "Cantidad (unidades, tokens o m²)"}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder={kind === "crypto" ? "0.42" : "1"}
                className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono font-bold text-sm outline-none focus:border-purple-500 transition"
              />
            </div>

            {/* Valor actual total */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground">
                  Valor total ({currency})
                </label>
                {kind === "crypto" && (
                  <span className="text-[10px] text-purple-400 font-semibold">
                    Calculado en vivo
                  </span>
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="6,200.00"
                className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono font-bold text-sm outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          {/* Color & Icon Picker for non-crypto */}
          {kind !== "crypto" && (
            <div className="flex flex-col gap-2.5 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Color representativo</span>
                <div className="flex items-center gap-1.5">
                  {CATEGORY_COLOR_LIST.slice(0, 7).map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      title={c.label}
                      onClick={() => setColorKey(c.key)}
                      className={`w-5 h-5 rounded-full transition cursor-pointer ${
                        colorKey === c.key
                          ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110"
                          : "opacity-75 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c.swatchHex }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {EXTENDED_ICONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    title={item.label}
                    onClick={() => setIconKey(item.key)}
                    className={`p-2 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                      iconKey === item.key
                        ? "bg-purple-600/20 border-purple-500 text-purple-300 ring-1 ring-purple-500/40"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <CategoryIcon iconKey={item.key} className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70 mt-2 shrink-0">
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
              className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              {submitting ? "Guardando..." : "Guardar activo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
