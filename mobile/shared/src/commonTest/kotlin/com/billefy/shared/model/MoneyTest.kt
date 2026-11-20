package com.billefy.shared.model

import kotlin.test.Test
import kotlin.test.assertEquals

class MoneyTest {
    @Test
    fun testMoneyCreation() {
        val money = Money.of("100.5", "BOB")
        assertEquals("100.5", money.amount.toPlainString())
        assertEquals("BOB", money.currency)
    }
}
