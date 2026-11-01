import { describe, expect, it } from "vitest";
import { getLoanCancellationAvailability, loanCancellationErrorMessage } from "./loan-cancellation";
import { LoanSummaryDto } from "./lending.types";

const loan = (overrides: Partial<LoanSummaryDto> = {}) => ({
  id: "loan-1",
  counterpartyId: "person-1",
  counterpartyName: "Persona",
  type: "Borrowed" as const,
  template: "NoInterest",
  status: "Active",
  principal: { toFixed: () => "100.00" } as LoanSummaryDto["principal"],
  currency: "BOB",
  interestRate: 0,
  annualEffectiveRate: 0,
  remainingPrincipal: { toFixed: () => "100.00" } as LoanSummaryDto["remainingPrincipal"],
  disbursementDate: "2026-01-01",
  firstDueDate: "2026-02-01",
  totalInstallments: 1,
  createdAt: "2026-01-01",
  cancellationEligibility: { canCancel: true, reasonCode: null },
  ...overrides,
});

describe("loan cancellation availability", () => {
  it("allows cancellation only from an explicit server eligibility result", () => {
    expect(getLoanCancellationAvailability(loan())).toMatchObject({ canCancel: true });
    expect(getLoanCancellationAvailability(loan({ cancellationEligibility: undefined }))).toMatchObject({ canCancel: false, reason: "No se pudo verificar si este préstamo puede anularse. Actualiza el detalle e inténtalo de nuevo." });
  });

  it.each([
    ["Loan.HasPayments", "Este préstamo ya tiene pagos registrados y no se puede anular."],
    ["Loan.LegacyDisbursementUnlinked", "Este préstamo antiguo no tiene un desembolso vinculado de forma segura y no se puede anular."],
    ["Loan.InvalidStatus", "Solo se pueden anular préstamos activos sin pagos."],
    ["Loan.InvalidDisbursementLink", "No se pudo validar el desembolso vinculado. Contacta con soporte antes de volver a intentarlo."],
    ["Loan.DisbursementMismatch", "El desembolso no coincide con este préstamo. No se realizaron cambios."],
    ["Loan.DisbursementAlreadyReversed", "El desembolso ya fue revertido. Actualiza el préstamo para ver su estado."],
    ["Loan.DisbursementNotFound", "No se encontró el desembolso original. No se realizaron cambios."],
  ])("explains %s without exposing server details", (code, message) => {
    expect(loanCancellationErrorMessage({ code })).toBe(message);
  });

  it("uses a safe fallback for unknown errors", () => {
    expect(loanCancellationErrorMessage(new Error("secret server detail"))).toBe("No se pudo anular el préstamo. Actualiza la información e inténtalo de nuevo.");
  });
});
