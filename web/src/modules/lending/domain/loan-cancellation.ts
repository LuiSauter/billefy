import { LoanSummaryDto } from "./lending.types";

export interface LoanCancellationAvailability {
  canCancel: boolean;
  reason: string | null;
}

const reasonMessages: Record<string, string> = {
  "Loan.HasPayments": "Este préstamo ya tiene pagos registrados y no se puede anular.",
  "Loan.LegacyDisbursementUnlinked": "Este préstamo antiguo no tiene un desembolso vinculado de forma segura y no se puede anular.",
  "Loan.InvalidStatus": "Solo se pueden anular préstamos activos sin pagos.",
  "Loan.InvalidDisbursementLink": "No se pudo validar el desembolso vinculado. Contacta con soporte antes de volver a intentarlo.",
  "Loan.DisbursementMismatch": "El desembolso no coincide con este préstamo. No se realizaron cambios.",
  "Loan.DisbursementAlreadyReversed": "El desembolso ya fue revertido. Actualiza el préstamo para ver su estado.",
  "Loan.DisbursementNotFound": "No se encontró el desembolso original. No se realizaron cambios.",
};

export function getLoanCancellationAvailability(
  loan: Pick<LoanSummaryDto, "status" | "cancellationEligibility">
): LoanCancellationAvailability {
  const eligibility = loan.cancellationEligibility;
  if (!eligibility) {
    return {
      canCancel: false,
      reason: "No se pudo verificar si este préstamo puede anularse. Actualiza el detalle e inténtalo de nuevo.",
    };
  }
  if (loan.status !== "Active") {
    return { canCancel: false, reason: "Solo se pueden anular préstamos activos sin pagos." };
  }
  if (eligibility.canCancel) return { canCancel: true, reason: null };
  return {
    canCancel: false,
    reason: reasonMessages[eligibility.reasonCode ?? ""] ?? "Este préstamo no se puede anular en su estado actual.",
  };
}

export function loanCancellationErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "code" in error && typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code
      : typeof error === "string"
      ? error
      : "";
  const code = Object.keys(reasonMessages).find((candidate) => message.includes(candidate));
  return code
    ? reasonMessages[code]
    : "No se pudo anular el préstamo. Actualiza la información e inténtalo de nuevo.";
}
