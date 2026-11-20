package com.billefy.shared.model

import kotlin.test.Test
import kotlin.test.assertEquals

class AccountModelsTest {
    @Test
    fun testAccountDtoCreation() {
        val money = Money.of("2500.0", "BOB")
        val account = AccountDto(
            id = "acc-123",
            name = "Banco Mercantil",
            type = "Bank",
            currency = "BOB",
            balance = money,
            createdAt = "2026-10-26T12:00:00Z"
        )

        assertEquals("acc-123", account.id)
        assertEquals("Banco Mercantil", account.name)
        assertEquals("BOB", account.currency)
        assertEquals("2500", account.balance.amount.toPlainString())
    }
}
