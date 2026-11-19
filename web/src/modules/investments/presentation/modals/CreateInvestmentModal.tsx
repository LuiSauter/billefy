"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, TrendingUp, RefreshCw } from "lucide-react";
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
import { toNumber } from "../parse-amount-input";
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
import { Amount, Percentage } from "@/shared/ui/amount";
import { Button } from "@/shared/ui/button";
import { ChipRadioGroup } from "@/shared/ui/chip-radio-group";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SelectField } from "@/shared/ui/select-field";

interface CreateInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateInvestmentInput) => Promise<void>;
  onFetchStockQuote?: (ticker: string) => Promise<StockQuote | null>;
  currency?: string;
}

const CURRENCY_CHOICES = ["USDT", "USD", "BOB", "EUR"];

const EXTENDED_ICONS: { key: CategoryIconKey; label: string }[] = [
  ...ACCOUNT_ICON_CHOICES,
  { key: "home" as CategoryIconKey, label: "Inmueble" },
  { key: "laptop" as CategoryIconKey, label: "Tecnología" },
  { key: "car" as CategoryIconKey, label: "Vehículo" },
  { key: "gift" as CategoryIconKey, label: "Colección" },
];

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

function LiveQuoteRow({
  icon,
  title,
  subtitle,
  price,
  changePercent,
  loading,
  emptyLabel = "...",
  onRefresh,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  price?: number;
  changePercent?: number | null;
  loading: boolean;
  emptyLabel?: string;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          {loading ? (
            <RefreshCw className="size-3.5 animate-spin text-muted-foreground" aria-label="Cargando cotización" />
          ) : price !== undefined ? (
            <Amount value={price} currency="USD" size="sm" tone="inherit" />
          ) : (
            <span className="text-xs text-muted-foreground">{emptyLabel}</span>
          )}
          {onRefresh && (
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Refrescar cotización" onClick={onRefresh}>
              <RefreshCw className={cn("size-3", loading && "animate-spin")} />
            </Button>
          )}
        </div>
        {changePercent !== null && changePercent !== undefined && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Percentage value={changePercent} sign="always" size="inherit" tone="auto" />
            <span>(24h)</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function CreateInvestmentModal({
  isOpen,
  onClose,
  onCreate,
  onFetchStockQuote,
  currency: defaultCurrency = "USD",
}: CreateInvestmentModalProps) {
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAssetMeta>(POPULAR_CRYPTOS[0]); // Default BTC
  const [name, setName] = useState(`${selectedCrypto.name} (${selectedCrypto.symbol})`);
  const [ticker, setTicker] = useState(selectedCrypto.symbol);
  const [kind, setKind] = useState<InvestmentKind>("crypto");
  const [iconKey, setIconKey] = useState<CategoryIconKey>("coins");
  const [colorKey, setColorKey] = useState<CategoryColorKey>("amber");
  const [currency, setCurrency] = useState("USDT");
  const [quantity, setQuantity] = useState("");
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Crypto Specific State
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
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Registrar nueva inversión"
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="create-investment-form" disabled={!valid || submitting} loading={submitting}>
            {submitting ? "Guardando..." : "Guardar activo"}
          </Button>
        </>
      }
    >
      <form id="create-investment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Tipo de activo</legend>
          <ChipRadioGroup
            label="Tipo de activo"
            options={INVESTMENT_KINDS}
            value={kind}
            onChange={(next) => pickKind(next as InvestmentKind)}
          />
        </fieldset>

        {kind === "crypto" ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
            <FormField label="Buscar criptomoneda">
              {(control) => (
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    {...control}
                    type="text"
                    value={cryptoSearch}
                    onChange={(e) => setCryptoSearch(e.target.value)}
                    placeholder="Buscar Bitcoin, SOL, BNB, Ethereum..."
                    className="pl-9"
                  />
                </div>
              )}
            </FormField>
            <ChipRadioGroup
              label="Seleccionar Criptomoneda"
              options={filteredCryptos.slice(0, 10).map((crypto) => ({ value: crypto.symbol, label: `${crypto.iconText} ${crypto.symbol}` }))}
              value={selectedCrypto.symbol}
              onChange={(symbol) => {
                const crypto = filteredCryptos.find((item) => item.symbol === symbol);
                if (crypto) void selectCryptoAsset(crypto);
              }}
              scroll
            />
            <LiveQuoteRow
              icon={selectedCrypto.iconText}
              title={`${selectedCrypto.name} (${selectedCrypto.symbol})`}
              subtitle={`Par: ${selectedCrypto.pair} · Binance Spot`}
              price={liveTicker?.price}
              changePercent={liveTicker?.priceChangePercent}
              loading={loadingTicker}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(kind === "stocks" || kind === "funds") && (
              <>
                <ChipRadioGroup
                  label={kind === "stocks" ? "Acciones populares" : "ETFs / Fondos populares"}
                  options={(kind === "stocks" ? POPULAR_STOCKS : POPULAR_FUNDS).map((item) => ({ value: item.symbol, label: item.symbol }))}
                  value={ticker}
                  onChange={(symbol) => {
                    const item = (kind === "stocks" ? POPULAR_STOCKS : POPULAR_FUNDS).find((item) => item.symbol === symbol);
                    if (item) (kind === "stocks" ? selectStockPreset : selectFundPreset)(item);
                  }}
                  scroll
                />
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold">
                    Buscar y seleccionar {kind === "stocks" ? "acción" : "fondo / ETF"}
                  </legend>
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
                </fieldset>
                <FormField label="Símbolo o Ticker seleccionado">
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
                      onBlur={() => {
                        if (ticker.trim().length > 0) void loadStockQuote(ticker.trim());
                      }}
                      placeholder="Ej. NVDA, AAPL, SPY, VOO"
                      className="uppercase"
                    />
                  )}
                </FormField>
                <LiveQuoteRow
                  icon={<TrendingUp className="size-4" />}
                  title={liveStockQuote?.ticker ?? (ticker || "Ticker")}
                  subtitle={[liveStockQuote?.exchangeName, "Yahoo Finance"].filter(Boolean).join(" · ")}
                  price={liveStockQuote?.price}
                  changePercent={liveStockQuote?.changePercent}
                  loading={loadingStockQuote}
                  emptyLabel="Escribí un ticker"
                  onRefresh={ticker ? () => { void loadStockQuote(ticker); } : undefined}
                />
              </>
            )}

            {kind === "realestate" && (
              <ChipRadioGroup
                label="Tipo de propiedad"
                options={REAL_ESTATE_PRESETS.map((label) => ({ value: label, label }))}
                value={REAL_ESTATE_PRESETS.find((label) => name.startsWith(`${label} `)) ?? ""}
                onChange={selectRealEstatePreset}
                scroll
              />
            )}

            <FormField label={kind === "realestate" ? "Nombre o ubicación del inmueble" : "Nombre del activo"}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    kind === "realestate"
                      ? "Ej. Depto. Equipetrol 3B, Local Av. Monseñor"
                      : "Ej. ETF S&P 500, Apple Inc."
                  }
                  autoFocus
                />
              )}
            </FormField>
          </div>
        )}

        <FormField label="Moneda de valuación">
          {(control) => (
            <SelectField
              {...control}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={CURRENCY_CHOICES.map((code) => ({ value: code, label: code }))}
            />
          )}
        </FormField>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={
            kind === "crypto"
              ? `Cantidad de monedas (${selectedCrypto.symbol})`
              : kind === "stocks"
              ? "Cantidad de acciones o títulos"
              : kind === "funds"
              ? "Cantidad de cuotapartes"
              : kind === "realestate"
              ? "Superficie (m²) o Unidades"
              : "Cantidad (unidades)"
          }>
            {(control) => (
              <Input
                {...control}
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder={kind === "crypto" ? "0.42" : "1"}
              />
            )}
          </FormField>
          <FormField label={`Valor total (${currency})`}>
            {(control) => (
              <MoneyInput
                {...control}
                currency={currency || defaultCurrency}
                value={value}
                onValueChange={handleValueChange}
                maxDecimals={Number.MAX_SAFE_INTEGER}
              />
            )}
          </FormField>
        </div>

        {kind !== "crypto" && (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Color representativo</legend>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_COLOR_LIST.slice(0, 7).map((color) => (
                  <Button
                    key={color.key}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={color.label}
                    aria-pressed={colorKey === color.key}
                    onClick={() => setColorKey(color.key)}
                    className={cn("rounded-full", colorKey === color.key && "ring-2 ring-primary")}
                  >
                    <span className="size-5 rounded-full" style={{ backgroundColor: color.swatchHex }} />
                  </Button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Ícono</legend>
              <div className="grid grid-cols-6 gap-2">
                {EXTENDED_ICONS.map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={item.label}
                    aria-pressed={iconKey === item.key}
                    onClick={() => setIconKey(item.key)}
                    className={cn("w-full border-border text-muted-foreground", iconKey === item.key && "border-primary bg-primary/10 text-primary")}
                  >
                    <CategoryIcon iconKey={item.key} className="size-4" />
                  </Button>
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </form>
    </ResponsiveDrawer>
  );
}
