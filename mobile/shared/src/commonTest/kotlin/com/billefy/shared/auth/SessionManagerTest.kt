package com.billefy.shared.auth

import com.billefy.shared.api.HttpRequest
import com.billefy.shared.api.HttpResponse
import com.billefy.shared.api.HttpTransport
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class SessionManagerTest {
    @Test
    fun retriesUnauthorizedReadOnceAfterRotatingRefreshToken() = runBlocking {
        val store = InMemorySessionStore(
            SessionTokens("old-access", "old-refresh", 60, "Bearer")
        )
        val transport = RecordingTransport { request ->
            when {
                request.path.endsWith("/auth/refresh") -> HttpResponse(
                    200,
                    """{"accessToken":"new-access","refreshToken":"new-refresh","expiresIn":120,"tokenType":"Bearer","user":{"id":"u1","email":"a@example.test","fullName":"A","pictureUrl":null,"preferredCurrency":"BOB","createdAt":"2026-01-01T00:00:00Z"}}"""
                )
                request.headers["Authorization"] == "Bearer old-access" -> HttpResponse(401, "")
                request.headers["Authorization"] == "Bearer new-access" -> HttpResponse(200, "[]")
                else -> error("Unexpected request")
            }
        }
        val session = SessionManager("https://api.example.test", transport, store)

        val response = session.executeAuthenticated("GET", "/v1/accounts")

        assertEquals(200, response.status)
        assertEquals(1, transport.requests.count { it.path.endsWith("/auth/refresh") })
        assertEquals("new-refresh", store.tokens?.refreshToken)
        assertEquals(3, transport.requests.size)
    }

    @Test
    fun staleRetryUnauthorizedCannotClearTokensFromANewerLogin() = runBlocking {
        val store = InMemorySessionStore(SessionTokens("old-access", "old-refresh", 60, "Bearer"))
        val retryStarted = CompletableDeferred<Unit>()
        val releaseRetry = CompletableDeferred<Unit>()
        val transport = RecordingTransport { request ->
            when {
                request.path == "/v1/accounts" && request.headers["Authorization"] == "Bearer old-access" -> HttpResponse(401, "")
                request.path.endsWith("/auth/refresh") -> authResponse("refreshed-old", "refreshed-old-refresh")
                request.path == "/v1/accounts" -> {
                    retryStarted.complete(Unit)
                    releaseRetry.await()
                    HttpResponse(401, "")
                }
                request.path.endsWith("/auth/google") -> authResponse("new-login", "new-login-refresh")
                else -> error("Unexpected request")
            }
        }
        val session = SessionManager("https://api.example.test", transport, store)
        val oldRequest = async { session.executeAuthenticated("GET", "/v1/accounts") }
        retryStarted.await()

        session.loginWithGoogle("new-id-token")
        releaseRetry.complete(Unit)
        assertEquals(401, oldRequest.await().status)

        assertEquals("new-login", store.tokens?.accessToken)
        assertEquals("new-login-refresh", store.tokens?.refreshToken)
    }

    @Test
    fun oldInitialUnauthorizedCannotReplayAcrossLogoutAndLogin() = runBlocking {
        val store = InMemorySessionStore(SessionTokens("old-access", "old-refresh", 60, "Bearer"))
        val firstUnauthorized = CompletableDeferred<Unit>()
        val releaseUnauthorized = CompletableDeferred<Unit>()
        val transport = RecordingTransport { request ->
            when {
                request.path == "/v1/accounts" && request.headers["Authorization"] == "Bearer old-access" -> {
                    firstUnauthorized.complete(Unit)
                    releaseUnauthorized.await()
                    HttpResponse(401, "")
                }
                request.path.endsWith("/auth/logout") -> HttpResponse(200, "")
                request.path.endsWith("/auth/google") -> authResponse("new-login", "new-login-refresh")
                else -> error("Unexpected request crossed the session boundary: ${request.path}")
            }
        }
        val session = SessionManager("https://api.example.test", transport, store)
        val oldRequest = async { session.executeAuthenticated("GET", "/v1/accounts") }
        firstUnauthorized.await()

        session.logout()
        session.loginWithGoogle("new-id-token")
        releaseUnauthorized.complete(Unit)

        assertEquals(401, oldRequest.await().status)
        assertEquals("new-login", store.tokens?.accessToken)
        assertEquals(1, transport.requests.count { it.path == "/v1/accounts" })
    }

    @Test
    fun concurrentUnauthorizedReadsReuseSameSessionRefresh() = runBlocking {
        val store = InMemorySessionStore(SessionTokens("old-access", "old-refresh", 60, "Bearer"))
        val twoUnauthorizedResponses = CompletableDeferred<Unit>()
        val releaseUnauthorized = CompletableDeferred<Unit>()
        var oldRequestCount = 0
        val transport = RecordingTransport { request ->
            when {
                request.path == "/v1/accounts" && request.headers["Authorization"] == "Bearer old-access" -> {
                    oldRequestCount++
                    if (oldRequestCount == 2) twoUnauthorizedResponses.complete(Unit)
                    releaseUnauthorized.await()
                    HttpResponse(401, "")
                }
                request.path.endsWith("/auth/refresh") -> authResponse("refreshed", "rotated-refresh")
                request.path == "/v1/accounts" && request.headers["Authorization"] == "Bearer refreshed" -> HttpResponse(200, "[]")
                else -> error("Unexpected request")
            }
        }
        val session = SessionManager("https://api.example.test", transport, store)
        val firstRequest = async { session.executeAuthenticated("GET", "/v1/accounts") }
        val secondRequest = async { session.executeAuthenticated("GET", "/v1/accounts") }
        twoUnauthorizedResponses.await()
        releaseUnauthorized.complete(Unit)

        assertEquals(200, firstRequest.await().status)
        assertEquals(200, secondRequest.await().status)
        assertEquals(1, transport.requests.count { it.path.endsWith("/auth/refresh") })
    }

    @Test
    fun failedRefreshClearsSessionAndDoesNotRetryAgain() = runBlocking {
        val store = InMemorySessionStore(SessionTokens("expired", "refresh", 60, "Bearer"))
        val transport = RecordingTransport { request ->
            if (request.path.endsWith("/auth/refresh")) HttpResponse(401, "")
            else HttpResponse(401, "")
        }
        val session = SessionManager("https://api.example.test", transport, store)

        val response = session.executeAuthenticated("GET", "/v1/accounts")

        assertEquals(401, response.status)
        assertNull(store.tokens)
        assertEquals(2, transport.requests.size)
        assertTrue(transport.requests.none { it.headers["Authorization"] == "Bearer refresh" })
    }

    @Test
    fun refreshServerFailureIsReturnedWithoutDiscardingSession() = runBlocking {
        val store = InMemorySessionStore(SessionTokens("old", "refresh", 60, "Bearer"))
        val transport = RecordingTransport { request ->
            if (request.path.endsWith("/auth/refresh")) HttpResponse(503, "")
            else HttpResponse(401, "")
        }
        val session = SessionManager("https://api.example.test", transport, store)

        val response = session.executeAuthenticated("GET", "/v1/accounts")

        assertEquals(503, response.status)
        assertEquals("refresh", store.tokens?.refreshToken)
        assertEquals(2, transport.requests.size)
    }

    @Test
    fun secondUnauthorizedResponseExpiresTheSessionWithoutAnotherRefresh() = runBlocking {
        val store = InMemorySessionStore(SessionTokens("old", "refresh", 60, "Bearer"))
        val transport = RecordingTransport { request ->
            if (request.path.endsWith("/auth/refresh")) HttpResponse(
                200,
                """{"accessToken":"new","refreshToken":"rotated","expiresIn":120,"tokenType":"Bearer","user":{"id":"u1","email":"a@example.test","fullName":"A","pictureUrl":null,"preferredCurrency":"BOB","createdAt":"2026-01-01T00:00:00Z"}}"""
            ) else HttpResponse(401, "")
        }
        val session = SessionManager("https://api.example.test", transport, store)

        val response = session.executeAuthenticated("GET", "/v1/accounts")

        assertEquals(401, response.status)
        assertNull(store.tokens)
        assertEquals(3, transport.requests.size)
        assertEquals(1, transport.requests.count { it.path.endsWith("/auth/refresh") })
    }

    @Test
    fun nonUnauthorizedFailuresDoNotAttemptRefresh() = runBlocking {
        val store = InMemorySessionStore(SessionTokens("access", "refresh", 60, "Bearer"))
        val transport = RecordingTransport { HttpResponse(503, "") }
        val session = SessionManager("https://api.example.test", transport, store)

        val response = session.executeAuthenticated("GET", "/v1/accounts")

        assertEquals(503, response.status)
        assertEquals(1, transport.requests.size)
        assertEquals("refresh", store.tokens?.refreshToken)
    }
}

private fun authResponse(accessToken: String, refreshToken: String) = HttpResponse(
    200,
    """{"accessToken":"$accessToken","refreshToken":"$refreshToken","expiresIn":120,"tokenType":"Bearer","user":{"id":"u1","email":"a@example.test","fullName":"A","pictureUrl":null,"preferredCurrency":"BOB","createdAt":"2026-01-01T00:00:00Z"}}"""
)

private class InMemorySessionStore(initial: SessionTokens?) : SessionStore {
    var tokens: SessionTokens? = initial
    override suspend fun load(): SessionTokens? = tokens
    override suspend fun save(tokens: SessionTokens) { this.tokens = tokens }
    override suspend fun clear() { tokens = null }
}

private class RecordingTransport(
    private val responder: suspend (HttpRequest) -> HttpResponse
) : HttpTransport {
    val requests = mutableListOf<HttpRequest>()
    override suspend fun execute(request: HttpRequest): HttpResponse {
        requests += request
        return responder(request)
    }
}
