import Decimal from "decimal.js";
import { toDecimal } from "@/shared/domain/money";

export interface RateSnapshotDto {
  appliedRate: number;
  rateSource: string;
  fetchedAt: string;
  isStale: boolean;
}

export interface CurrencyCatalogEntryDto {
  code: string;
  name: string;
  symbol: string;
  precision: number;
  isActive: boolean;
}

export interface IFxRepository {
  getLatestRate(currency: string, baseCurrency?: string): Promise<RateSnapshotDto>;
  getCurrencies(): Promise<CurrencyCatalogEntryDto[]>;
}

export function convertCurrencyAmount(
  amount: Decimal | string | number,
  fromCurrency: string,
  toCurrency: string,
  p2pRate: number | Decimal
): Decimal {
  const amt = toDecimal(amount);
  const rate = toDecimal(p2pRate);
  const safeRate = rate.gt(0) ? rate : new Decimal("9.85");

  if (fromCurrency === toCurrency) return amt;
  if (fromCurrency === "BOB" && (toCurrency === "USD" || toCurrency === "USDT")) {
    return amt.div(safeRate);
  }
  if ((fromCurrency === "USD" || fromCurrency === "USDT") && toCurrency === "BOB") {
    return amt.times(safeRate);
  }
  return amt;
}
