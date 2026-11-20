import { normalizeAmountString } from "@/shared/lib/keypad";

/** Lenient parse of a user-typed amount for previews; financial writes use exact decimal strings instead. */
export function toNumber(raw: string): number {
  const n = parseFloat(normalizeAmountString(raw.trim()) || "0");
  return Number.isFinite(n) ? n : 0;
}
