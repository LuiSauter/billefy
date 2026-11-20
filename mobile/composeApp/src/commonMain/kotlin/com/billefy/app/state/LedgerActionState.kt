package com.billefy.app.state

/** Financial inputs stay textual until validated and sent as exact decimal JSON numbers. */
data class LedgerActionState(
    val accountFormOpen: Boolean = false,
    val movementFormOpen: Boolean = false,
    val reversalFormOpen: Boolean = false,
    val selectedTransactionId: String? = null,
    val reversalReason: String = "",
    val accountName: String = "",
    val accountType: String = "Bank",
    val accountCurrency: String = "BOB",
    val openingBalance: String = "0",
    val selectedAccountId: String? = null,
    val direction: String = "Expense",
    val amount: String = "",
    val description: String = "",
    val busy: Boolean = false,
    val message: String? = null,
    val messageKind: LedgerMessageKind? = null,
    val needsOutcomeAcknowledgement: Boolean = false,
    val confirmedWrite: Boolean = false
)

enum class LedgerMessageKind { Validation, DefinitiveFailure, UnknownOutcome, RefreshFailure, Success }

internal fun validateDecimalInput(value: String, allowNegative: Boolean): String? {
    if (!value.matches(Regex("-?(0|[1-9][0-9]*)(\\.[0-9]{1,6})?"))) return "Ingresa un importe válido con punto decimal y hasta 6 decimales."
    val unsigned = value.removePrefix("-")
    if (unsigned.substringBefore('.').length > 14) return "El importe supera el máximo permitido."
    if (!allowNegative && value.startsWith('-')) return "El importe debe ser mayor que cero."
    if (unsigned.none { it in '1'..'9' } && !allowNegative) return "El importe debe ser distinto de cero."
    return null
}
