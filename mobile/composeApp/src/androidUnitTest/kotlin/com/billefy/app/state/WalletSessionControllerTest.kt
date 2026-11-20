package com.billefy.app.state

import com.billefy.shared.model.AccountDto
import com.billefy.shared.model.Money
import com.billefy.shared.model.RateSnapshotDto
import com.billefy.shared.wallet.WalletTransaction
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlin.coroutines.CoroutineContext
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull

class WalletSessionControllerTest {
    private fun check(block: suspend CoroutineScope.() -> Unit) = runBlocking {
        val scope = CoroutineScope(Dispatchers.Unconfined + SupervisorJob())
        try { block(scope) } finally { scope.cancel() }
    }

    @Test fun noStoredSessionStartsSignedOut() = check {
        val port = FakePort()
        val controller = WalletSessionController(port, this)
        controller.start()
        assertIs<AuthState.SignedOut>(controller.state.value.auth)
    }

    @Test fun restoredSessionRequiresAccountValidation() = check {
        val port = FakePort(stored = true, failAccounts = true)
        val controller = WalletSessionController(port, this)
        controller.start()
        assertFalse(controller.state.value.auth is AuthState.Authenticated)
        assertEquals("No se pudo cargar la billetera. Comprueba tu conexión e inténtalo de nuevo.", controller.state.value.walletError)
    }

    @Test fun unauthorizedTransactionsExpireSession() = check {
        val port = FakePort(stored = true, transactionsFailure = UnauthorizedSessionException())
        val controller = WalletSessionController(port, this)
        controller.start()
        assertIs<AuthState.SignedOut>(controller.state.value.auth)
        assertEquals(emptyList(), controller.state.value.accounts)
    }

    @Test fun unauthorizedRateExpiresSession() = check {
        val port = FakePort(stored = true, rateFailure = UnauthorizedSessionException())
        val controller = WalletSessionController(port, this)
        controller.start()
        assertIs<AuthState.SignedOut>(controller.state.value.auth)
        assertEquals(emptyList(), controller.state.value.accounts)
    }

    @Test fun nonUnauthorizedSecondaryFailuresPreserveAccountsIndependently() = check {
        val txPort = FakePort(stored = true, transactionsFailure = IllegalStateException("offline"))
        val txController = WalletSessionController(txPort, this)
        txController.start()
        assertEquals("Cuenta", txController.state.value.accounts.single().name)
        assertEquals("No se pudo cargar la actividad reciente.", txController.state.value.activityError)
        assertNull(txController.state.value.rateError)

        val ratePort = FakePort(stored = true, rateFailure = IllegalStateException("offline"))
        val rateController = WalletSessionController(ratePort, this)
        rateController.start()
        assertEquals("Cuenta", rateController.state.value.accounts.single().name)
        assertEquals("Tipo de cambio no disponible.", rateController.state.value.rateError)
    }

    @Test fun delayedRestoreCannotOverwriteLoginOrLogout() = check {
        val restoreGate = CompletableDeferred<Boolean>()
        val restoreStarted = CompletableDeferred<Unit>()
        val port = FakePort(sessionGate = restoreGate, sessionStarted = restoreStarted)
        val controller = WalletSessionController(port, this)
        controller.start()
        restoreStarted.await()
        controller.login { LoginResult.Success("new-token") }
        assertIs<AuthState.Authenticated>(controller.state.value.auth)
        restoreGate.complete(false)
        assertIs<AuthState.Authenticated>(controller.state.value.auth)

        val logoutGate = CompletableDeferred<Boolean>()
        val logoutStarted = CompletableDeferred<Unit>()
        val logoutController = WalletSessionController(
            FakePort(sessionGate = logoutGate, sessionStarted = logoutStarted), this
        )
        logoutController.start()
        logoutStarted.await()
        logoutController.logout()
        logoutGate.complete(true)
        assertFalse(logoutController.state.value.auth is AuthState.Authenticated)
        assertEquals(emptyList(), logoutController.state.value.accounts)
    }

    @Test fun credentialCompletingAfterLogoutIsNeverExchanged() = check {
        val port = FakePort()
        val controller = WalletSessionController(port, this)
        controller.start()
        val providerStarted = CompletableDeferred<Unit>()
        val providerGate = CompletableDeferred<LoginResult>()
        controller.login { providerStarted.complete(Unit); providerGate.await() }
        providerStarted.await()
        controller.logout()
        providerGate.complete(LoginResult.Success("stale-token"))
        assertEquals(0, port.loginCalls)
        assertFalse(controller.state.value.auth is AuthState.Authenticated)
    }

    @Test fun exchangeCompletingAfterLogoutCannotRestoreSession() = check {
        val loginStarted = CompletableDeferred<Unit>()
        val loginGate = CompletableDeferred<LoginResult>()
        val port = FakePort(loginGate = loginGate, loginStarted = loginStarted)
        val controller = WalletSessionController(port, this)
        controller.start()
        controller.login { LoginResult.Success("late-token") }
        loginStarted.await()
        controller.logout()
        loginGate.complete(LoginResult.Success("late-token"))
        assertFalse(port.stored)
        assertFalse(controller.state.value.auth is AuthState.Authenticated)
    }

    @Test fun delayedLogoutClearCannotEraseNewLogin() = check {
        val clearStarted = CompletableDeferred<Unit>()
        val clearGate = CompletableDeferred<Unit>()
        val port = FakePort(clearGate = clearGate, clearStarted = clearStarted)
        val controller = WalletSessionController(port, this)
        controller.start()
        controller.logout()
        clearStarted.await()
        controller.login { LoginResult.Success("fresh-token") }
        controller.logout()
        controller.start()
        clearGate.complete(Unit)
        assertIs<AuthState.SignedOut>(controller.state.value.auth)
        assertEquals(0, port.loginCalls)
        assertEquals(1, port.clearCalls)
        controller.login { LoginResult.Success("fresh-token") }
        assertIs<AuthState.Authenticated>(controller.state.value.auth)
        assertEquals(true, port.stored)
    }

    @Test fun loginCannotPassQueuedLogoutClearBeforeItAcquiresAuthMutex() {
        val dispatcher = ControlledDispatcher()
        val scope = CoroutineScope(dispatcher + SupervisorJob())
        try {
            val port = FakePort()
            val controller = WalletSessionController(port, scope)
            controller.start()
            dispatcher.drain()
            assertIs<AuthState.SignedOut>(controller.state.value.auth)

            controller.logout()
            dispatcher.runNext() // actor handles logout and queues clear; clear has not run yet
            assertIs<AuthState.SigningOut>(controller.state.value.auth)
            controller.login { LoginResult.Success("replacement-token") }
            dispatcher.runLatest() // process the login event while the clear task is still queued
            if (controller.state.value.auth == AuthState.SigningIn) {
                dispatcher.runLatest() // credential provider
                dispatcher.runLatest() // credential result event
                dispatcher.runLatest() // token exchange
            }
            assertEquals(0, port.loginCalls, "login must not be exchanged while logout cleanup is pending")

            dispatcher.drain() // cleanup completes before any later login is admitted
            assertIs<AuthState.SignedOut>(controller.state.value.auth)
            assertEquals(0, port.loginCalls)
            assertEquals(1, port.clearCalls)
            assertEquals(1, port.sessionCalls)
            controller.login { LoginResult.Success("replacement-token") }
            dispatcher.drain()
            assertIs<AuthState.Authenticated>(controller.state.value.auth)
            assertEquals(true, port.stored)
        } finally { scope.cancel() }
    }

    @Test fun clearFailureAfter401KeepsPrivateDataHiddenAndReportsFailure() = check {
        val port = FakePort(stored = true, transactionsFailure = UnauthorizedSessionException(), clearFailure = true)
        val controller = WalletSessionController(port, this)
        controller.start()
        assertEquals(emptyList(), controller.state.value.accounts)
        assertFalse(controller.state.value.auth is AuthState.Authenticated)
        assertEquals("No se pudo cerrar la sesión de forma segura. Reintenta.", controller.state.value.authError)
    }

    @Test fun staleClearFailureRemainsVisibleAfterNewLoginCancellation() = check {
        val clearStarted = CompletableDeferred<Unit>()
        val clearGate = CompletableDeferred<Unit>()
        val port = FakePort(stored = true, clearGate = clearGate, clearStarted = clearStarted, clearFailure = true)
        val controller = WalletSessionController(port, this)
        controller.logout()
        clearStarted.await()
        controller.login { LoginResult.Success("must-not-exchange") }
        clearGate.complete(Unit)
        assertEquals(0, port.loginCalls)
        assertEquals(true, port.stored)
        assertIs<AuthState.SignOutFailed>(controller.state.value.auth)
        assertEquals("No se pudo cerrar la sesión de forma segura. Reintenta.", controller.state.value.authError)
    }

    @Test fun retryRejectsLateOlderReadFromSameSession() = check {
        val delayed = CompletableDeferred<List<AccountDto>>()
        val started = CompletableDeferred<Unit>()
        val port = FakePort(stored = true, accountReplies = mutableListOf(
            { listOf(account("Inicial")) }, delayed.awaitWith(started), { listOf(account("Nuevo")) }
        ))
        val controller = WalletSessionController(port, this)
        controller.start()
        controller.retryWallet()
        started.await()
        controller.retryWallet()
        assertEquals("Nuevo", controller.state.value.accounts.single().name)
        delayed.complete(listOf(account("Antiguo")))
        assertEquals("Nuevo", controller.state.value.accounts.single().name)
    }
}

private class ControlledDispatcher : CoroutineDispatcher() {
    private val tasks = java.util.ArrayDeque<Runnable>()
    override fun dispatch(context: CoroutineContext, block: Runnable) { tasks.addLast(block) }
    fun runNext() { if (tasks.isNotEmpty()) tasks.removeFirst().run() }
    fun runLatest() { if (tasks.isNotEmpty()) tasks.removeLast().run() }
    fun drain() { repeat(1000) { if (tasks.isEmpty()) return; runNext() } }
}

private class FakePort(
    var stored: Boolean = false,
    var sessionGate: CompletableDeferred<Boolean>? = null,
    var sessionStarted: CompletableDeferred<Unit>? = null,
    var loginGate: CompletableDeferred<LoginResult>? = null,
    var loginStarted: CompletableDeferred<Unit>? = null,
    var clearGate: CompletableDeferred<Unit>? = null,
    var clearStarted: CompletableDeferred<Unit>? = null,
    private val failAccounts: Boolean = false,
    private val transactionsFailure: Exception? = null,
    private val rateFailure: Exception? = null,
    private val clearFailure: Boolean = false,
    var accountReplies: MutableList<suspend () -> List<AccountDto>> = mutableListOf()
) : WalletSessionPort {
    var loginCalls = 0
    var clearCalls = 0
    var sessionCalls = 0
    override suspend fun hasSession(): Boolean {
        sessionCalls++
        sessionStarted?.complete(Unit)
        return sessionGate?.await() ?: stored
    }
    override suspend fun login(googleIdToken: String): LoginResult {
        loginCalls++
        loginStarted?.complete(Unit)
        val result = loginGate?.await() ?: LoginResult.Success(googleIdToken)
        if (result is LoginResult.Success) stored = true
        return result
    }
    override suspend fun clearSession() {
        clearCalls++
        clearStarted?.complete(Unit)
        clearGate?.await()
        if (clearFailure) error("keystore clear failed")
        stored = false
    }
    override suspend fun loadAccounts(): List<AccountDto> {
        if (accountReplies.isNotEmpty()) return accountReplies.removeAt(0).invoke()
        if (failAccounts) error("network")
        return listOf(account())
    }
    override suspend fun loadRecentTransactions(): List<WalletTransaction> {
        transactionsFailure?.let { throw it }
        return emptyList()
    }
    override suspend fun loadRate(): RateSnapshotDto {
        rateFailure?.let { throw it }
        return RateSnapshotDto("9.5", "test", "2025-01-01", false)
    }
}

private fun account(name: String = "Cuenta") = AccountDto("1", name, "Bank", "BOB", Money.of("10.25", "BOB"), "2025-01-01")
private fun CompletableDeferred<List<AccountDto>>.awaitWith(started: CompletableDeferred<Unit>): suspend () -> List<AccountDto> = {
    started.complete(Unit)
    withContext(NonCancellable) { await() }
}
