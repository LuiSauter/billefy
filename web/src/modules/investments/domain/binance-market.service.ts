import Decimal from "decimal.js";

export interface CryptoAssetMeta {
  symbol: string;
  name: string;
  pair: string;
  color: string;
  iconText: string;
  decimals: number;
}

export interface CryptoTickerPrice {
  symbol: string;
  pair: string;
  price: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
}

export const POPULAR_CRYPTOS: CryptoAssetMeta[] = [
  { symbol: "BTC", name: "Bitcoin", pair: "BTCUSDT", color: "#f7931a", iconText: "₿", decimals: 8 },
  { symbol: "ETH", name: "Ethereum", pair: "ETHUSDT", color: "#627eea", iconText: "Ξ", decimals: 6 },
  { symbol: "SOL", name: "Solana", pair: "SOLUSDT", color: "#14f195", iconText: "◎", decimals: 4 },
  { symbol: "BNB", name: "BNB", pair: "BNBUSDT", color: "#f3ba2f", iconText: "❖", decimals: 4 },
  { symbol: "USDT", name: "Tether", pair: "USDTUSDT", color: "#26a17b", iconText: "₮", decimals: 2 },
  { symbol: "USDC", name: "USD Coin", pair: "USDCUSDT", color: "#2775ca", iconText: "₵", decimals: 2 },
  { symbol: "XRP", name: "XRP", pair: "XRPUSDT", color: "#23292f", iconText: "✕", decimals: 2 },
  { symbol: "ADA", name: "Cardano", pair: "ADAUSDT", color: "#0033ad", iconText: "₳", decimals: 4 },
  { symbol: "AVAX", name: "Avalanche", pair: "AVAXUSDT", color: "#e84142", iconText: "▲", decimals: 4 },
  { symbol: "DOGE", name: "Dogecoin", pair: "DOGEUSDT", color: "#c2a633", iconText: "Ð", decimals: 2 },
  { symbol: "DOT", name: "Polkadot", pair: "DOTUSDT", color: "#e6007a", iconText: "●", decimals: 4 },
  { symbol: "LINK", name: "Chainlink", pair: "LINKUSDT", color: "#375bd2", iconText: "⬡", decimals: 4 },
  { symbol: "SUI", name: "Sui", pair: "SUIUSDT", color: "#2a82e4", iconText: "💧", decimals: 4 },
  { symbol: "NEAR", name: "NEAR Protocol", pair: "NEARUSDT", color: "#000000", iconText: "Ⓝ", decimals: 4 },
  { symbol: "PEPE", name: "Pepe", pair: "PEPEUSDT", color: "#459a46", iconText: "🐸", decimals: 0 },
];

export function getCryptoBySymbol(symbol: string): CryptoAssetMeta | undefined {
  const norm = symbol.trim().toUpperCase();
  return POPULAR_CRYPTOS.find((c) => c.symbol === norm);
}

export function calculateCryptoUsdtValue(quantity: number, price: number): number {
  if (!quantity || quantity <= 0 || !price || price <= 0) return 0;
  return new Decimal(quantity)
    .times(new Decimal(price))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
}

export function calculateCryptoQuantityFromUsdt(
  valueUsdt: number,
  price: number,
  decimals: number = 8
): number {
  if (!valueUsdt || valueUsdt <= 0 || !price || price <= 0) return 0;
  const decPlaces = Math.min(8, Math.max(0, decimals));
  return new Decimal(valueUsdt)
    .div(new Decimal(price))
    .toDecimalPlaces(decPlaces, Decimal.ROUND_HALF_UP)
    .toNumber();
}

export function extractCryptoSymbol(inv: { name: string; kind?: string }): string | null {
  if (inv.kind && inv.kind !== "crypto") return null;
  const match = inv.name.match(/\(([A-Za-z0-9]+)\)/);
  if (match) return match[1].toUpperCase();

  const upper = inv.name.trim().toUpperCase();
  const direct = POPULAR_CRYPTOS.find(
    (c) =>
      c.symbol === upper ||
      upper.startsWith(c.symbol + " ") ||
      upper.endsWith(" " + c.symbol) ||
      upper.includes(c.name.toUpperCase())
  );
  return direct?.symbol ?? null;
}

export async function fetchCryptoTicker(symbol: string): Promise<CryptoTickerPrice | null> {
  const sym = symbol.trim().toUpperCase();
  const pair = sym === "USDT" ? "USDTUSDT" : `${sym}USDT`;

  if (sym === "USDT") {
    return {
      symbol: "USDT",
      pair: "USDTUSDT",
      price: 1.0,
      priceChangePercent: 0.0,
      highPrice: 1.0,
      lowPrice: 1.0,
      volume: 0,
    };
  }

  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`);
    if (!res.ok) return null;

    const data = await res.json();
    return {
      symbol: sym,
      pair: data.symbol || pair,
      price: parseFloat(data.lastPrice) || 0,
      priceChangePercent: parseFloat(data.priceChangePercent) || 0,
      highPrice: parseFloat(data.highPrice) || 0,
      lowPrice: parseFloat(data.lowPrice) || 0,
      volume: parseFloat(data.volume) || 0,
    };
  } catch {
    return null;
  }
}
