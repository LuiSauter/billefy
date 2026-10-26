package com.billefy.shared.model

data class AccountDto(
    val id: String,
    val name: String,
    val type: String,
    val currency: String,
    val balance: Money,
    val createdAt: String
)

data class CreateAccountRequest(
    val name: String,
    val type: String,
    val currency: String,
    val initialBalance: String = "0"
)

data class RegisterTransactionRequest(
    val accountId: String,
    val amount: String,
    val direction: String,
    val description: String? = null
)

data class RateSnapshotDto(
    val appliedRate: String,
    val rateSource: String,
    val fetchedAt: String,
    val isStale: Boolean
)
