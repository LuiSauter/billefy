export type CurrencyPosition = "prefix" | "suffix";
export interface CurrencyMeta { code: string; symbol: string; position: CurrencyPosition }
const CURRENCIES: Record<string, Omit<CurrencyMeta, "code">> = {
  BOB: { symbol: "Bs", position: "prefix" }, USD: { symbol: "$", position: "prefix" },
  USDT: { symbol: "USDT", position: "suffix" }, EUR: { symbol: "€", position: "prefix" },
  ARS: { symbol: "$", position: "prefix" }, BRL: { symbol: "R$", position: "prefix" },
};
export function getCurrencyMeta(code: string): CurrencyMeta {
  const normalized = code.toUpperCase();
  return { code: normalized, ...(CURRENCIES[normalized] ?? { symbol: normalized, position: "suffix" as const }) };
}
export function formatCurrencyLabel(code: string): string {
  const meta = getCurrencyMeta(code);
  return meta.position === "prefix" ? `${meta.symbol}` : meta.code;
}
