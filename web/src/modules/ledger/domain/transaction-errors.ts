/** Maps known backend error codes (Result.Error.Code) to a user-facing Spanish message. */
export const KNOWN_TRANSACTION_ERRORS: Record<string, string> = {
  "Transaction.InsufficientFunds":
    "Esta cuenta no admite saldo negativo: el gasto supera los fondos disponibles.",
};

export function translateTransactionError(reason: unknown, fallback: string): string {
  const code = reason instanceof Error ? (reason as Error & { code?: string }).code : undefined;
  if (code && KNOWN_TRANSACTION_ERRORS[code]) return KNOWN_TRANSACTION_ERRORS[code];
  return reason instanceof Error && reason.message.trim() ? reason.message : fallback;
}
