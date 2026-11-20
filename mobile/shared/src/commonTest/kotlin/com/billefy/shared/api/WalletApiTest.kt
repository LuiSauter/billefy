package com.billefy.shared.api

import com.billefy.shared.auth.SessionManager
import com.billefy.shared.auth.SessionStore
import com.billefy.shared.auth.SessionTokens
import com.billefy.shared.model.Money
import com.billefy.shared.wallet.WalletApi
import kotlinx.coroutines.runBlocking
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class WalletApiTest {
    @Test
    fun createsAccountAndRegistersTransactionWithExactDecimalJsonNumbers() = runBlocking {
        val transport = RecordingTransport(listOf(HttpResponse(201, """{"id":"account-id"}"""), HttpResponse(201, """{"id":"transaction-id"}""")))
        val api = WalletApi(session(transport))
        assertEquals("account-id", api.createAccount("Ahorro", "Savings", "USD", "-12345678901234.123456"))
        assertEquals("transaction-id", api.registerTransaction("account-id", "0.000001", "Income", "nota"))
        val accountJson = Json.parseToJsonElement(transport.requests[0].body!!).jsonObject
        assertEquals("-12345678901234.123456", accountJson.getValue("initialBalance").jsonPrimitive.content)
        assertTrue(!accountJson.getValue("initialBalance").jsonPrimitive.isString)
        assertEquals("0.000001", Json.parseToJsonElement(transport.requests[1].body!!).jsonObject.getValue("amount").jsonPrimitive.content)
        assertTrue(!Json.parseToJsonElement(transport.requests[1].body!!).jsonObject.getValue("amount").jsonPrimitive.isString)
    }

    @Test
    fun rejectsInvalidFinancialInputsBeforeRequest() = runBlocking {
        val transport = RecordingTransport(emptyList())
        val api = WalletApi(session(transport))
        kotlin.test.assertFails { api.createAccount(" ", "Bank", "USD", "1") }
        kotlin.test.assertFails { api.registerTransaction(" ", "1e2", "Expense", null) }
        assertTrue(transport.requests.isEmpty())
    }

    @Test fun rejectsNon201AndMalformedCreatedResponsesWithoutTransportReplay() = runBlocking {
        val rejected = RecordingTransport(listOf(HttpResponse(400, "{}")))
        kotlin.test.assertFailsWith<com.billefy.shared.wallet.WalletApiException> {
            WalletApi(session(rejected)).createAccount("Cuenta", "Bank", "BOB", "0")
        }
        assertEquals(1, rejected.requests.size)

        for (body in listOf("not-json", "{}", "{\"id\":\"\"}")) {
            val malformed = RecordingTransport(listOf(HttpResponse(201, body)))
            kotlin.test.assertFailsWith<Exception> { WalletApi(session(malformed)).registerTransaction("account", "1", "Expense", null) }
            assertEquals(1, malformed.requests.size)
        }
    }

    @Test fun reversesTransactionWithOptionalQuotedReasonAndCorrelatedIds() = runBlocking {
        val original = "123e4567-e89b-12d3-a456-426614174000"
        val reversal = "123e4567-e89b-12d3-a456-426614174001"
        val transport = RecordingTransport(listOf(HttpResponse(200, """{"id":"$reversal","reversedTransactionId":"$original"}""")))
        val result = WalletApi(session(transport)).reverseTransaction(original, "  Motivo \"especial\"  ")
        assertEquals(reversal, result.id)
        assertEquals(original, result.reversedTransactionId)
        assertEquals("POST", transport.requests.single().method)
        assertEquals("/v1/transactions/$original/reverse", transport.requests.single().path)
        assertEquals("{\"reason\":\"Motivo \\\"especial\\\"\"}", transport.requests.single().body)
    }

    @Test fun reversalConflictIsDefinitiveAndMalformedOrMismatchedSuccessIsSingleUnknownAttempt() = runBlocking {
        val original = "123e4567-e89b-12d3-a456-426614174000"
        val conflict = RecordingTransport(listOf(HttpResponse(409, "{}")))
        kotlin.test.assertEquals(409, kotlin.test.assertFailsWith<com.billefy.shared.wallet.WalletApiException> {
            WalletApi(session(conflict)).reverseTransaction(original)
        }.status)
        assertEquals(1, conflict.requests.size)

        for (body in listOf("not-json", "{}", "{\"id\":\"bad\",\"reversedTransactionId\":\"$original\"}", "{\"id\":\"123e4567-e89b-12d3-a456-426614174001\",\"reversedTransactionId\":\"123e4567-e89b-12d3-a456-426614174099\"}")) {
            val malformed = RecordingTransport(listOf(HttpResponse(200, body)))
            kotlin.test.assertFailsWith<Exception> { WalletApi(session(malformed)).reverseTransaction(original) }
            assertEquals(1, malformed.requests.size)
        }
    }

    @Test fun blankReversalReasonIsOmittedAndInvalidOriginalIsRejectedBeforeNetwork() = runBlocking {
        val original = "123e4567-e89b-12d3-a456-426614174000"
        val transport = RecordingTransport(listOf(HttpResponse(200, """{"id":"123e4567-e89b-12d3-a456-426614174001","reversedTransactionId":"$original"}""")))
        WalletApi(session(transport)).reverseTransaction(original, "  ")
        assertEquals("{}", transport.requests.single().body)
        val empty = RecordingTransport(emptyList())
        kotlin.test.assertFails { WalletApi(session(empty)).reverseTransaction("not-a-guid") }
        assertTrue(empty.requests.isEmpty())
    }

    @Test
    fun mapsAccountAmountsWithoutFloatingPointRounding() = runBlocking {
        val transport = SingleResponseTransport(
            HttpResponse(
                200,
                """[{"id":"acc-1","name":"Primary","type":"Bank","currency":"USD","balance":123456789012345.123456,"createdAt":"2026-01-02T03:04:05Z","iconKey":null,"colorKey":null}]"""
            )
        )
        val session = SessionManager("https://api.example.test", transport, object : SessionStore {
            override suspend fun load(): SessionTokens? = SessionTokens("access", "refresh", 60, "Bearer")
            override suspend fun save(tokens: SessionTokens) = Unit
            override suspend fun clear() = Unit
        })
        val api = WalletApi(session)

        val accounts = api.getAccounts()

        assertEquals(1, accounts.size)
        assertEquals(Money.of("123456789012345.123456", "USD"), accounts.single().balance)
        assertEquals("Bank", accounts.single().type)
    }
    private fun session(transport: HttpTransport) = SessionManager("https://api.example.test", transport, object : SessionStore {
        override suspend fun load(): SessionTokens? = SessionTokens("access", "refresh", 60, "Bearer")
        override suspend fun save(tokens: SessionTokens) = Unit
        override suspend fun clear() = Unit
    })
}

private class RecordingTransport(private val responses: List<HttpResponse>) : HttpTransport {
    val requests = mutableListOf<HttpRequest>()
    override suspend fun execute(request: HttpRequest): HttpResponse {
        requests += request
        return responses[requests.lastIndex]
    }
}

private class SingleResponseTransport(private val response: HttpResponse) : HttpTransport {
    override suspend fun execute(request: HttpRequest): HttpResponse = response
}

