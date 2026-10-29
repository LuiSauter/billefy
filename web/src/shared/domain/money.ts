import Decimal from "decimal.js";

// Ensure Decimal uses half away from zero by default for consistency with backend
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export type CurrencyCode = "BOB" | "USD" | "USDT" | string;

export interface Money {
  amount: Decimal;
  currency: CurrencyCode;
}

export function createMoney(amount: string | number | Decimal, currency: string): Money {
  return {
    amount: new Decimal(amount),
    currency: currency.toUpperCase(),
  };
}

export function toDecimal(value: string | number | Decimal | undefined | null): Decimal {
  if (value instanceof Decimal) return value;
  if (value === undefined || value === null || value === "") return new Decimal(0);
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add different currencies: ${a.currency} and ${b.currency}`);
  }
  return {
    amount: a.amount.plus(b.amount),
    currency: a.currency,
  };
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract different currencies: ${a.currency} and ${b.currency}`);
  }
  return {
    amount: a.amount.minus(b.amount),
    currency: a.currency,
  };
}

export function formatMoney(money: Money, decimals: number = 2): string {
  return `${money.amount.toFixed(decimals)} ${money.currency}`;
}
