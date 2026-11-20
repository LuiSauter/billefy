import { describe, expect, it } from "vitest";
import { translateTransactionError } from "./transaction-errors";

describe("translateTransactionError", () => {
  it("translates a known backend error code to a Spanish user-facing message", () => {
    const error = new Error("This account type does not support a negative balance; the expense exceeds the available funds.") as Error & { code?: string };
    error.code = "Transaction.InsufficientFunds";
    expect(translateTransactionError(error, "fallback")).toBe(
      "Esta cuenta no admite saldo negativo: el gasto supera los fondos disponibles."
    );
  });

  it("falls back to the raw error message when the code is unknown", () => {
    const error = new Error("Account not found.") as Error & { code?: string };
    error.code = "Account.NotFound";
    expect(translateTransactionError(error, "fallback")).toBe("Account not found.");
  });

  it("falls back to the provided default when there is no error message", () => {
    expect(translateTransactionError(new Error(""), "fallback")).toBe("fallback");
    expect(translateTransactionError("not an error", "fallback")).toBe("fallback");
  });
});
