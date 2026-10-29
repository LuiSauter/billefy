/** Pure display helpers shared by the ingestion modals. */

/** Human readable file size: "512 B", "1.5 KB", "5.0 MB". */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Signed amount for display only: "+Bs 150.00", "-$ 20.00", "-20.00 USDT".
 * BOB and USD use a leading symbol; any other currency a trailing code.
 */
export function formatSignedAmount(
  amount: { toFixed(decimals: number): string },
  currency: string,
  direction: "Income" | "Expense"
): string {
  const sign = direction === "Income" ? "+" : "-"
  const value = amount.toFixed(2)
  if (currency === "BOB") return `${sign}Bs ${value}`
  if (currency === "USD") return `${sign}$ ${value}`
  return `${sign}${value} ${currency}`
}
