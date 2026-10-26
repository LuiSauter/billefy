package com.billefy.shared.detector

import com.billefy.shared.model.Money
import com.ionspin.kotlin.bignum.decimal.BigDecimal

enum class DetectedDirection {
    Income,
    Expense
}

data class DetectionResult(
    val isFinancial: Boolean,
    val amount: Money? = null,
    val direction: DetectedDirection? = null,
    val reference: String? = null,
    val confidence: Double = 0.0,
    val failureReason: String? = null
) {
    companion object {
        fun notFinancial(reason: String) = DetectionResult(
            isFinancial = false,
            failureReason = reason
        )
    }
}

object FinancialNotificationDetector {
    private val incomeRegex = Regex(
        "\\b(recibiste|recibido|dep[oó]sito|abono|acreditad[oa]|ingreso|transferencia recibida|reembolso|received|deposit|credited|refund)\\b",
        RegexOption.IGNORE_CASE
    )

    private val expenseRegex = Regex(
        "\\b(pagaste|pago\\s+realizado|pago|compra|retiro|transferencia enviada|transferiste|d[eé]bito|consumo|paid|spent|withdrew|sent|payment|debit)\\b",
        RegexOption.IGNORE_CASE
    )

    private val referenceRegex = Regex(
        "\\b(?:ref(?:erencia)?|nro\\.?|transacci[oó]n|op(?:eraci[oó]n)?|tx)\\s*[:#]?\\s*([A-Za-z0-9_-]{4,30})\\b",
        RegexOption.IGNORE_CASE
    )

    // Currencies and amounts
    private val bobPrefixRegex = Regex(
        "\\b(?:Bs\\.?|BOB)\\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})?)\\b",
        RegexOption.IGNORE_CASE
    )
    private val bobSuffixRegex = Regex(
        "\\b([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})?)\\s*(?:Bs\\.?|BOB)\\b",
        RegexOption.IGNORE_CASE
    )

    private val usdPrefixRegex = Regex(
        "(?:\\$|US\\$|USD)\\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})?)\\b",
        RegexOption.IGNORE_CASE
    )
    private val usdSuffixRegex = Regex(
        "\\b([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})?)\\s*(?:USD|US\\$)\\b",
        RegexOption.IGNORE_CASE
    )

    private val usdtRegex = Regex(
        "\\b(?:USDT)\\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})?)\\b|\\b([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})?)\\s*(?:USDT)\\b",
        RegexOption.IGNORE_CASE
    )

    fun evaluate(packageName: String?, title: String?, text: String?): DetectionResult {
        val fullText = buildString {
            if (!title.isNullOrBlank()) append(title).append(" ")
            if (!text.isNullOrBlank()) append(text)
        }.trim()

        if (fullText.isBlank()) {
            return DetectionResult.notFinancial("Empty notification content")
        }

        // 1. Extract Amount and Currency
        val amountPair = extractAmountAndCurrency(fullText)
            ?: return DetectionResult.notFinancial("No financial currency or amount found")

        val (rawAmountStr, currency) = amountPair

        // 2. Extract Direction
        val hasIncome = incomeRegex.containsMatchIn(fullText)
        val hasExpense = expenseRegex.containsMatchIn(fullText)

        if (!hasIncome && !hasExpense) {
            return DetectionResult.notFinancial("No financial movement keyword found")
        }

        val direction = if (hasIncome && !hasExpense) {
            DetectedDirection.Income
        } else if (hasExpense && !hasIncome) {
            DetectedDirection.Expense
        } else {
            val incomeIndex = incomeRegex.find(fullText)?.range?.first ?: Int.MAX_VALUE
            val expenseIndex = expenseRegex.find(fullText)?.range?.first ?: Int.MAX_VALUE
            if (incomeIndex < expenseIndex) DetectedDirection.Income else DetectedDirection.Expense
        }

        // 3. Extract Reference
        val reference = referenceRegex.find(fullText)?.groups?.get(1)?.value

        // 4. Clean and parse amount
        val normalizedAmount = normalizeAmountString(rawAmountStr)
        val parsedDecimal = try {
            BigDecimal.parseString(normalizedAmount)
        } catch (_: Exception) {
            return DetectionResult.notFinancial("Could not parse numeric amount: $rawAmountStr")
        }

        var confidence = 0.85
        if (reference != null) confidence += 0.10

        return DetectionResult(
            isFinancial = true,
            amount = Money(parsedDecimal, currency),
            direction = direction,
            reference = reference,
            confidence = minOf(1.0, confidence)
        )
    }

    private fun extractAmountAndCurrency(text: String): Pair<String, String>? {
        // 1. USDT
        val usdtMatch = usdtRegex.find(text)
        if (usdtMatch != null) {
            val amountStr = usdtMatch.groups[1]?.value ?: usdtMatch.groups[2]?.value
            if (amountStr != null) return Pair(amountStr, "USDT")
        }

        // 2. Bolivianos
        val bobMatch = bobPrefixRegex.find(text) ?: bobSuffixRegex.find(text)
        if (bobMatch != null) {
            return Pair(bobMatch.groups[1]!!.value, "BOB")
        }

        // 3. USD
        val usdMatch = usdPrefixRegex.find(text) ?: usdSuffixRegex.find(text)
        if (usdMatch != null) {
            return Pair(usdMatch.groups[1]!!.value, "USD")
        }

        return null
    }

    private fun normalizeAmountString(raw: String): String {
        var clean = raw.trim()
        if (clean.contains('.') && clean.contains(',')) {
            val dotIndex = clean.lastIndexOf('.')
            val commaIndex = clean.lastIndexOf(',')
            clean = if (commaIndex > dotIndex) {
                // Comma is decimal separator (e.g. 1.250,50)
                clean.replace(".", "").replace(',', '.')
            } else {
                // Dot is decimal separator (e.g. 1,250.50)
                clean.replace(",", "")
            }
        } else if (clean.contains(',')) {
            clean = clean.replace(',', '.')
        }
        return clean
    }
}
