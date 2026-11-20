package com.billefy.shared.auth

import com.billefy.shared.api.HttpRequest
import com.billefy.shared.api.HttpResponse
import com.billefy.shared.api.HttpTransport
import com.billefy.shared.api.apiUrl
import com.billefy.shared.api.jsonHeaders
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** Implement with Android Keystore-backed storage; no insecure default is provided. */
interface SessionStore {
    suspend fun load(): SessionTokens?
    suspend fun save(tokens: SessionTokens)
    suspend fun clear()
}

data class SessionTokens(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int,
    val tokenType: String
)

class SessionManager(
    private val baseUrl: String,
    private val transport: HttpTransport,
    private val store: SessionStore
) {
    private val refreshMutex = Mutex()
    private var sessionGeneration = 0L

    suspend fun loginWithGoogle(idToken: String, preferredCurrency: String = "BOB"): HttpResponse =
        refreshMutex.withLock {
            val body = """{"idToken":${JsonPrimitiveEncoder.encode(idToken)},"preferredCurrency":${JsonPrimitiveEncoder.encode(preferredCurrency)}}"""
            val response = unauthenticatedPost("/api/v1/auth/google", body)
            if (response.status in 200..299) persistAuthResponse(response)
            response
        }

    suspend fun executeAuthenticated(method: String, path: String, body: String? = null): HttpResponse {
        require(path.startsWith("/v1/") && !path.startsWith("/v1/auth/")) {
            "Authenticated business requests must use a non-auth /v1 route"
        }
        val initial = refreshMutex.withLock {
            store.load()?.let { SessionSnapshot(it, sessionGeneration) }
        } ?: return HttpResponse(401, "")
        val first = sendAuthenticated(method, path, body, initial.tokens.accessToken)
        if (first.status != 401) return first

        var refreshFailure: HttpResponse? = null
        val refreshed = refreshMutex.withLock {
            if (sessionGeneration != initial.generation) return@withLock null
            val current = store.load() ?: return@withLock null
            if (current != initial.tokens) return@withLock current
            val response = unauthenticatedPost(
                "/api/v1/auth/refresh",
                """{"refreshToken":${JsonPrimitiveEncoder.encode(current.refreshToken)}}"""
            )
            if (response.status !in 200..299) {
                if (response.status == 401) {
                    store.clear()
                    sessionGeneration++
                } else {
                    refreshFailure = response
                }
                return@withLock null
            }
            try {
                parseTokens(response.body).also { store.save(it) }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (_: Exception) {
                store.clear()
                sessionGeneration++
                null
            }
        } ?: return refreshFailure ?: first

        val retry = sendAuthenticated(method, path, body, refreshed.accessToken)
        if (retry.status == 401) {
            refreshMutex.withLock {
                if (sessionGeneration == initial.generation && store.load() == refreshed) {
                    store.clear()
                    sessionGeneration++
                }
            }
        }
        return retry
    }

    suspend fun logout(): HttpResponse? = refreshMutex.withLock {
        val tokens = store.load() ?: return@withLock null
        try {
            sendAuthenticated(
                "POST",
                "/api/v1/auth/logout",
                """{"refreshToken":${JsonPrimitiveEncoder.encode(tokens.refreshToken)}}""",
                tokens.accessToken
            )
        } finally {
            store.clear()
            sessionGeneration++
        }
    }

    suspend fun clearLocalSession() = refreshMutex.withLock {
        store.clear()
        sessionGeneration++
    }

    private suspend fun sendAuthenticated(
        method: String,
        path: String,
        body: String?,
        accessToken: String
    ): HttpResponse = transport.execute(
        HttpRequest(
            method = method,
            url = apiUrl(baseUrl, path),
            path = path,
            headers = jsonHeaders() + ("Authorization" to "Bearer $accessToken"),
            body = body
        )
    )

    private suspend fun unauthenticatedPost(path: String, body: String): HttpResponse = transport.execute(
        HttpRequest("POST", apiUrl(baseUrl, path), path, jsonHeaders(), body)
    )

    private suspend fun persistAuthResponse(response: HttpResponse) {
        try {
            store.save(parseTokens(response.body))
            sessionGeneration++
        } catch (cancellation: CancellationException) {
            throw cancellation
        } catch (_: Exception) {
            store.clear()
            sessionGeneration++
            throw IllegalStateException("Authentication response was invalid")
        }
    }

    private data class SessionSnapshot(val tokens: SessionTokens, val generation: Long)

    private fun parseTokens(body: String): SessionTokens {
        val json = Json.parseToJsonElement(body).jsonObject
        return SessionTokens(
            accessToken = json.getValue("accessToken").jsonPrimitive.content,
            refreshToken = json.getValue("refreshToken").jsonPrimitive.content,
            expiresIn = json.getValue("expiresIn").jsonPrimitive.content.toInt(),
            tokenType = json.getValue("tokenType").jsonPrimitive.content
        )
    }
}

private object JsonPrimitiveEncoder {
    fun encode(value: String): String = kotlinx.serialization.json.JsonPrimitive(value).toString()
}
