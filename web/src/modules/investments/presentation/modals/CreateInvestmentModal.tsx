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
  calculateCryptoQuantityFromUsdt,
  CryptoTickerPrice,
  CryptoAssetMeta,
} from "../../domain/binance-market.service";
import {
  fetchStockQuote,
  StockQuote,
  calculateStockTotalValue,
  calculateStockQuantityFromValue,
} from "../../domain/stock-market.service";
import { StockPicker } from "../StockPicker";
import { cn } from "@/shared/lib/utils";

interface CreateInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateInvestmentInput) => Promise<void>;
  onFetchStockQuote?: (ticker: string) => Promise<StockQuote | null>;
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

const POPULAR_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", color: "blue" as CategoryColorKey },
  { symbol: "NVDA", name: "NVIDIA Corp.", color: "emerald" as CategoryColorKey },
  { symbol: "MSFT", name: "Microsoft", color: "sky" as CategoryColorKey },
  { symbol: "GOOGL", name: "Alphabet (Google)", color: "amber" as CategoryColorKey },
  { symbol: "AMZN", name: "Amazon.com", color: "orange" as CategoryColorKey },
  { symbol: "TSLA", name: "Tesla Inc.", color: "rose" as CategoryColorKey },
  { symbol: "MELI", name: "MercadoLibre", color: "yellow" as CategoryColorKey },
];

const POPULAR_FUNDS = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF", color: "emerald" as CategoryColorKey },
  { symbol: "VOO", name: "Vanguard S&P 500", color: "rose" as CategoryColorKey },
  { symbol: "QQQ", name: "Invesco QQQ (Nasdaq)", color: "purple" as CategoryColorKey },
  { symbol: "VTI", name: "Vanguard Total Stock", color: "blue" as CategoryColorKey },
  { symbol: "SCHD", name: "Schwab US Dividend", color: "cyan" as CategoryColorKey },
  { symbol: "VT", name: "Vanguard Total World", color: "teal" as CategoryColorKey },
];

const REAL_ESTATE_PRESETS = [
  "Departamento",
  "Casa",
  "Local / Oficina",
  "Terreno",
  "Cochera / Garaje",
  "Edificio en renta",
];

export function CreateInvestmentModal({
  isOpen,
  onClose,
  onCreate,
  onFetchStockQuote,
  currencySymbol = "$",
}: CreateInvestmentModalProps) {
  void currencySymbol;
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
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

  // Stock / ETF Specific State
  const [liveStockQuote, setLiveStockQuote] = useState<StockQuote | null>(null);
  const [loadingStockQuote, setLoadingStockQuote] = useState(false);

  const loadStockQuote = useCallback(async (sym: string) => {
    if (!sym || sym.trim().length === 0) {
      setLiveStockQuote(null);
      return null;
    }
    setLoadingStockQuote(true);
    try {
      const q = onFetchStockQuote ? await onFetchStockQuote(sym) : await fetchStockQuote(sym);
      setLiveStockQuote(q);
      return q;
    } finally {
      setLoadingStockQuote(false);
    }
  }, [onFetchStockQuote]);

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

  // When live ticker updates, if one field is filled and the other empty, auto-convert
  useEffect(() => {
    if (kind === "crypto" && liveTicker && liveTicker.price > 0) {
      const q = toNumber(quantity);
      const v = toNumber(value);
      if (v > 0 && q === 0) {
        setQuantity(String(calculateCryptoQuantityFromUsdt(v, liveTicker.price, selectedCrypto.decimals ?? 8)));
      } else if (q > 0 && v === 0) {
        setValue(String(calculateCryptoUsdtValue(q, liveTicker.price)));
      }
    }
  }, [liveTicker, kind, selectedCrypto.decimals, quantity, value]);

  // Recalculate estimated total value when quantity changes for crypto or stocks
  const handleQuantityChange = (rawQty: string) => {
    setQuantity(rawQty);
    const qty = toNumber(rawQty);
    if (kind === "crypto" && liveTicker && liveTicker.price > 0) {
      if (qty > 0) {
        setValue(String(calculateCryptoUsdtValue(qty, liveTicker.price)));
      } else if (rawQty.trim() === "") {
        setValue("");
      }
    } else if ((kind === "stocks" || kind === "funds") && liveStockQuote && liveStockQuote.price > 0) {
      if (qty > 0) {
        setValue(String(calculateStockTotalValue(qty, liveStockQuote.price)));
      } else if (rawQty.trim() === "") {
        setValue("");
      }
    }
  };

  // Recalculate estimated quantity when value in currency changes
  const handleValueChange = (rawVal: string) => {
    setValue(rawVal);
    const val = toNumber(rawVal);
    if (kind === "crypto" && liveTicker && liveTicker.price > 0) {
      if (val > 0) {
        const computedQty = calculateCryptoQuantityFromUsdt(
          val,
          liveTicker.price,
          selectedCrypto.decimals ?? 6
        );
        setQuantity(String(computedQty));
      } else if (rawVal.trim() === "") {
        setQuantity("");
      }
    } else if ((kind === "stocks" || kind === "funds") && liveStockQuote && liveStockQuote.price > 0) {
      if (val > 0) {
        const computedQty = calculateStockQuantityFromValue(val, liveStockQuote.price, 4);
        setQuantity(String(computedQty));
      } else if (rawVal.trim() === "") {
        setQuantity("");
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
      const val = toNumber(value);
      if (qty > 0) {
        setValue(String(calculateCryptoUsdtValue(qty, ticker.price)));
      } else if (val > 0) {
        setQuantity(String(calculateCryptoQuantityFromUsdt(val, ticker.price, crypto.decimals ?? 6)));
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
      setTicker(selectedCrypto.symbol);
      setCurrency("USDT");
      void loadTicker(selectedCrypto.symbol);
    } else {
      setName("");
      setTicker("");
      setCurrency("USD");
      const def = INVESTMENT_KINDS.find((i) => i.value === k);
      if (def) {
        setIconKey(def.icon);
        setColorKey(def.color);
      }
    }
  };

  const selectStockPreset = (item: { symbol: string; name: string; color: CategoryColorKey }) => {
    setTicker(item.symbol);
    setName(`${item.name} (${item.symbol})`);
    setIconKey("trending-up");
    setColorKey(item.color);
    void loadStockQuote(item.symbol).then((q) => {
      if (q && q.price > 0) {
        const qNum = toNumber(quantity);
        const vNum = toNumber(value);
        if (qNum > 0) setValue(String(calculateStockTotalValue(qNum, q.price)));
        else if (vNum > 0) setQuantity(String(calculateStockQuantityFromValue(vNum, q.price, 4)));
      }
    });
  };

  const selectFundPreset = (item: { symbol: string; name: string; color: CategoryColorKey }) => {
    setTicker(item.symbol);
    setName(`${item.name} (${item.symbol})`);
    setIconKey("piggy-bank");
    setColorKey(item.color);
    void loadStockQuote(item.symbol).then((q) => {
      if (q && q.price > 0) {
        const qNum = toNumber(quantity);
        const vNum = toNumber(value);
        if (qNum > 0) setValue(String(calculateStockTotalValue(qNum, q.price)));
        else if (vNum > 0) setQuantity(String(calculateStockQuantityFromValue(vNum, q.price, 4)));
      }
    });
  };

  const selectRealEstatePreset = (typeLabel: string) => {
    setName(`${typeLabel} `);
    setIconKey("home");
    setColorKey("violet");
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
      const finalTicker =
        ticker.trim().toUpperCase() ||
        (kind === "crypto" ? selectedCrypto.symbol : undefined);

      await onCreate({
        name: name.trim(),
        ticker: finalTicker,
        kind,
        iconKey,
        colorKey,
        currency,
        quantity: toNumber(quantity),
        currentValue: toNumber(value),
      });
      setName("");
      setTicker("");
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
            <div className="flex flex-col gap-3">
              {/* Specialized Stock / ETF / Real Estate Presets */}
              {kind === "stocks" && (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-[11px] font-bold text-foreground">Acciones populares:</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {POPULAR_STOCKS.map((item) => (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => selectStockPreset(item)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold shrink-0 transition cursor-pointer ${
                          ticker === item.symbol
                            ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                            : "bg-card border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {item.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {kind === "funds" && (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-[11px] font-bold text-foreground">ETFs / Fondos populares:</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {POPULAR_FUNDS.map((item) => (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => selectFundPreset(item)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold shrink-0 transition cursor-pointer ${
                          ticker === item.symbol
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                            : "bg-card border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {item.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {kind === "realestate" && (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-[11px] font-bold text-foreground">Tipo de propiedad:</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {REAL_ESTATE_PRESETS.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => selectRealEstatePreset(label)}
                        className="px-2.5 py-1 rounded-lg bg-card border border-border text-[11px] font-bold text-foreground hover:bg-muted shrink-0 transition cursor-pointer"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock / ETF Search Picker with shadcn */}
              {(kind === "stocks" || kind === "funds") && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground">
                      Buscar y seleccionar {kind === "stocks" ? "acción" : "fondo / ETF"}
                    </label>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      Mercado bursátil en vivo
                    </span>
                  </div>
                  <StockPicker
                    selectedTicker={ticker}
                    kind={kind}
                    placeholder={
                      kind === "stocks"
                        ? "Buscar acción por ticker o nombre (ej. NVDA, Apple, Tesla)..."
                        : "Buscar ETF por ticker o nombre (ej. SPY, S&P 500, QQQ)..."
                    }
                    onSelectStock={(stock) => {
                      setTicker(stock.symbol);
                      setName(`${stock.name} (${stock.symbol})`);
                      if (stock.type === "ETF") {
                        setIconKey("piggy-bank");
                        setColorKey("emerald");
                      } else {
                        setIconKey("trending-up");
                        setColorKey("blue");
                      }
                      void loadStockQuote(stock.symbol).then((q) => {
                        if (q && q.price > 0) {
                          const qNum = toNumber(quantity);
                          const vNum = toNumber(value);
                          if (qNum > 0) setValue(String(calculateStockTotalValue(qNum, q.price)));
                          else if (vNum > 0) setQuantity(String(calculateStockQuantityFromValue(vNum, q.price, 4)));
                        }
                      });
                    }}
                  />
                </div>
              )}

              {/* Ticker Input for Stocks & Funds (custom edit) */}
              {(kind === "stocks" || kind === "funds") && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-foreground">
                    Símbolo o Ticker seleccionado
                  </label>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    onBlur={() => {
                      if (ticker.trim().length > 0) void loadStockQuote(ticker.trim());
                    }}
                    placeholder="Ej. NVDA, AAPL, SPY, VOO"
                    className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono uppercase text-sm font-bold outline-none focus:border-purple-500 transition"
                  />
                </div>
              )}

              {/* Live Stock / ETF Quote Card from Yahoo Finance */}
              {(kind === "stocks" || kind === "funds") && (
                <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center font-black text-sm shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground text-xs font-mono">
                          {liveStockQuote ? liveStockQuote.ticker : ticker || "Ticker"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          Yahoo Finance
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {liveStockQuote?.exchangeName ? `${liveStockQuote.exchangeName} • ` : ""}Cotización en vivo
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-1.5">
                      {loadingStockQuote ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="font-mono font-bold text-sm text-foreground">
                          {liveStockQuote ? `$ ${liveStockQuote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Escribí un ticker"}
                        </span>
                      )}
                      {ticker && (
                        <button
                          type="button"
                          onClick={() => loadStockQuote(ticker)}
                          title="Refrescar cotización"
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                        >
                          <RefreshCw className={cn("w-3 h-3", loadingStockQuote && "animate-spin")} />
                        </button>
                      )}
                    </div>
                    {liveStockQuote?.changePercent !== null && liveStockQuote?.changePercent !== undefined && (
                      <span
                        className={cn(
                          "text-[10px] font-bold flex items-center gap-0.5",
                          liveStockQuote.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}
                      >
                        {liveStockQuote.changePercent >= 0 ? "+" : ""}
                        {liveStockQuote.changePercent.toFixed(2)}% (24h)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Name Field */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-foreground">
                  {kind === "realestate" ? "Nombre o ubicación del inmueble" : "Nombre del activo"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    kind === "realestate"
                      ? "Ej. Depto. Equipetrol 3B, Local Av. Monseñor"
                      : "Ej. ETF S&P 500, Apple Inc."
                  }
                  className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground text-sm font-semibold outline-none focus:border-purple-500 transition"
                  autoFocus
                />
              </div>
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
                  : kind === "stocks"
                  ? "Cantidad de acciones o títulos"
                  : kind === "funds"
                  ? "Cantidad de cuotapartes"
                  : kind === "realestate"
                  ? "Superficie (m²) o Unidades"
                  : "Cantidad (unidades)"}
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
                onChange={(e) => handleValueChange(e.target.value)}
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
