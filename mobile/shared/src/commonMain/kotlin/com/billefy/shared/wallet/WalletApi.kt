package com.billefy.shared.wallet

import com.billefy.shared.api.HttpResponse
import com.billefy.shared.auth.SessionManager
import com.billefy.shared.model.AccountDto
import com.billefy.shared.model.Money
import com.billefy.shared.model.RateSnapshotDto
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class WalletApi(private val session: SessionManager) {
    suspend fun createAccount(name: String, type: String, currency: String, initialBalance: String): String {
        require(name.isNotBlank()) { "Account name is required" }
        require(type in ACCOUNT_TYPES) { "Unsupported account type" }
        require(currency in CURRENCIES) { "Unsupported currency" }
        val balance = decimalNumber(initialBalance, allowNegative = true)
        val body = """{"name":${quote(name.trim())},"type":${quote(type)},"currency":${quote(currency)},"initialBalance":$balance}"""
        return createdId(session.executeAuthenticated("POST", "/v1/accounts", body))
    }

    suspend fun registerTransaction(accountId: String, amount: String, direction: String, description: String?): String {
        require(accountId.isNotBlank()) { "Account is required" }
        require(direction == "Income" || direction == "Expense") { "Unsupported direction" }
        val exactAmount = decimalNumber(amount, allowNegative = false)
        val note = description?.trim()?.takeIf { it.isNotEmpty() }
        val body = buildString {
            append("{\"accountId\":${quote(accountId)},\"amount\":$exactAmount,\"direction\":${quote(direction)}")
            if (note != null) append(",\"description\":${quote(note)}")
            append('}')
        }
        return createdId(session.executeAuthenticated("POST", "/v1/transactions", body))
    }

    suspend fun reverseTransaction(transactionId: String, reason: String? = null): ReversalResult {
        require(transactionId.matches(UUID_PATTERN)) { "Transaction ID must be a UUID" }
        val note = reason?.trim()?.takeIf { it.isNotEmpty() }
        val body = if (note == null) "{}" else "{\"reason\":${quote(note)}}"
        val response = session.executeAuthenticated("POST", "/v1/transactions/$transactionId/reverse", body)
        if (response.status != 200) throw WalletApiException(response.status)
        val item = Json.parseToJsonElement(response.body).jsonObject
        val reversalId = item.string("id")
        val reversedTransactionId = item.string("reversedTransactionId")
        require(reversalId.matches(UUID_PATTERN)) { "Invalid reversal ID" }
        require(reversedTransactionId.matches(UUID_PATTERN) && reversedTransactionId.equals(transactionId, ignoreCase = true)) {
            "Reversal response does not match requested transaction"
        }
        return ReversalResult(reversalId, reversedTransactionId)
    }

    suspend fun getAccounts(): List<AccountDto> =
        decodeArray(requireSuccess(session.executeAuthenticated("GET", "/v1/accounts"))) { value ->
            val item = value.jsonObject
            AccountDto(
                id = item.string("id"),
                name = item.string("name"),
                type = item.string("type"),
                currency = item.string("currency"),
                balance = Money.of(item.decimalString("balance"), item.string("currency")),
                createdAt = item.string("createdAt")
            )
        }

    suspend fun getTransactions(
        accountId: String? = null,
        direction: String? = null,
        from: String? = null,
        to: String? = null,
        limit: Int? = null
    ): List<WalletTransaction> {
        val query = listOfNotNull(
            accountId?.let { "accountId=${encode(it)}" },
            direction?.let { "direction=${encode(it)}" },
            from?.let { "from=${encode(it)}" },
            to?.let { "to=${encode(it)}" },
            limit?.let { "limit=$it" }
        ).joinToString("&")
        val path = "/v1/transactions" + if (query.isEmpty()) "" else "?$query"
        return decodeArray(requireSuccess(session.executeAuthenticated("GET", path))) { value ->
            val item = value.jsonObject
            val currency = item.string("currency")
            WalletTransaction(
                id = item.string("id"),
                accountId = item.string("accountId"),
                amount = Money.of(item.decimalString("amount"), currency),
                direction = item.string("direction"),
                categoryId = item.nullableString("categoryId"),
                occurredAt = item.string("occurredAt"),
                description = item.nullableString("description"),
                reversesId = item.nullableString("reversesId"),
                transferId = item.nullableString("transferId"),
                appliedRate = item.nullableDecimalString("appliedRate"),
                rateSource = item.nullableString("rateSource"),
                createdAt = item.string("createdAt")
            )
        }
    }

    suspend fun getLatestRate(currency: String, baseCurrency: String = "USD"): RateSnapshotDto {
        val path = "/v1/rates/latest?currency=${encode(currency)}&baseCurrency=${encode(baseCurrency)}"
        val item = Json.parseToJsonElement(requireSuccess(session.executeAuthenticated("GET", path)).body).jsonObject
        return RateSnapshotDto(
            appliedRate = item.decimalString("appliedRate"),
            rateSource = item.string("rateSource"),
            fetchedAt = item.string("fetchedAt"),
            isStale = item.getValue("isStale").jsonPrimitive.content.toBooleanStrict()
        )
    }

    private fun createdId(response: HttpResponse): String {
        if (response.status != 201) throw WalletApiException(response.status)
        return Json.parseToJsonElement(response.body).jsonObject.string("id").also { require(it.isNotBlank()) }
    }

    private fun decimalNumber(value: String, allowNegative: Boolean): String {
        require(value.matches(Regex("-?(0|[1-9][0-9]*)(\\.[0-9]{1,6})?"))) { "Invalid decimal amount" }
        require(allowNegative || !value.startsWith('-')) { "Amount must be positive" }
        val unsigned = value.removePrefix("-")
        val integerDigits = unsigned.substringBefore('.').length
        require(integerDigits <= 14 && unsigned.substringAfter('.', "").length <= 6) { "Amount exceeds numeric(20,6)" }
        if (!allowNegative) require(unsigned.any { it in '1'..'9' }) { "Amount must be non-zero" }
        return value
    }

    private fun quote(value: String): String = kotlinx.serialization.json.JsonPrimitive(value).toString()

    private fun encode(value: String): String = buildString {
        value.encodeToByteArray().forEach { byte ->
            val char = byte.toInt() and 0xff
            if (char in 'a'.code..'z'.code || char in 'A'.code..'Z'.code ||
                char in '0'.code..'9'.code || char in listOf('-'.code, '_'.code, '.'.code, '~'.code)
            ) append(char.toChar()) else append("%" + char.toString(16).uppercase().padStart(2, '0'))
        }
    }
    private val UUID_PATTERN = Regex("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
    private val ACCOUNT_TYPES = setOf("Bank", "Wallet", "Cash", "Exchange", "Savings", "Checking", "CryptoWallet", "International")
    private val CURRENCIES = setOf("BOB", "USD", "USDT")
}

data class ReversalResult(val id: String, val reversedTransactionId: String)

data class WalletTransaction(
    val id: String,
    val accountId: String,
    val amount: Money,
    val direction: String,
    val categoryId: String?,
    val occurredAt: String,
    val description: String?,
    val reversesId: String?,
    val transferId: String?,
    val appliedRate: String?,
    val rateSource: String?,
    val createdAt: String
)

private fun requireSuccess(response: HttpResponse): HttpResponse {
    if (response.status !in 200..299) throw WalletApiException(response.status)
    return response
}

class WalletApiException(val status: Int) : IllegalStateException("API request failed with status $status")

private inline fun <T> decodeArray(
    response: HttpResponse,
    crossinline map: (kotlinx.serialization.json.JsonElement) -> T
): List<T> = Json.parseToJsonElement(response.body).jsonArray.map { map(it) }

private fun JsonObject.string(key: String): String = getValue(key).jsonPrimitive.content

private fun JsonObject.decimalString(key: String): String = string(key)

private fun JsonObject.nullableString(key: String): String? =
    get(key)?.takeUnless { it === JsonNull }?.jsonPrimitive?.content

private fun JsonObject.nullableDecimalString(key: String): String? = nullableString(key)
