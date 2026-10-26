package com.billefy.shared.model

import com.ionspin.kotlin.bignum.decimal.BigDecimal
import com.ionspin.kotlin.bignum.decimal.RoundingMode

data class Money(
    val amount: BigDecimal,
    val currency: String
) {
    companion object {
        fun of(amountString: String, currency: String): Money {
            val decimal = BigDecimal.parseString(amountString)
            return Money(decimal, currency.uppercase())
        }
    }
}
