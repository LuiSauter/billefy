/** Pure display helpers shared by the ingestion modals. */
import { formatNumber, getNumberFormatPreferences } from "@/shared/lib/number-format";
import { formatAmountText } from "@/shared/lib/amount-format";

/** Human readable file size: "512 B", "1.5 KB", "5.0 MB". */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const preferences = getNumberFormatPreferences();
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, preferences.convention, 1)} KB`;
  return `${formatNumber(bytes / (1024 * 1024), preferences.convention, 1)} MB`;
}

export function formatSignedAmount(amount: string | number | { toString(): string }, currency: string, direction: "Income" | "Expense"): string {
  const preferences = getNumberFormatPreferences();
  const value = typeof amount === "object" ? amount.toString() : amount;
  return formatAmountText(value, currency, preferences, { sign: "always", currencyDisplay: "symbol" }).replace(/^([+-])/, direction === "Income" ? "+" : "-");
}
