package com.billefy.app.state

import com.billefy.shared.model.AccountDto
import com.billefy.shared.model.Money
import com.billefy.shared.model.RateSnapshotDto
import com.billefy.shared.wallet.WalletApiException
import com.billefy.shared.wallet.WalletTransaction
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class LedgerActionControllerTest {
    @Test fun zeroOpeningBalanceIsAcceptedAndNegativeOpeningBalanceRemainsValid() = runBlocking {
        val fixture = Fixture()
        try {
            fixture.controller.openAccountForm()
            fixture.controller.updateLedger { it.copy(accountName = "A", openingBalance = "0.000000") }
            fixture.controller.submitAccount()
            assertEquals(listOf("A|Bank|BOB|0.000000"), fixture.port.accountWrites)
            fixture.controller.openAccountForm()
            fixture.controller.updateLedger { it.copy(accountName = "B", openingBalance = "-1.25") }
            fixture.controller.submitAccount()
            assertEquals("B|Bank|BOB|-1.25", fixture.port.accountWrites.last())
        } finally { fixture.close() }
    }

    @Test fun unknownWriteCannotBeDismissedOrReplacedByOpeningForms() = runBlocking {
        val fixture = Fixture(writeFailure = WalletApiException(503))
        try {
            fixture.controller.openAccountForm()
            fixture.controller.updateLedger { it.copy(accountName = "Keep me", openingBalance = "4") }
            fixture.controller.submitAccount()
            val warning = fixture.controller.state.value.ledger.message
            assertTrue(fixture.controller.state.value.ledger.needsOutcomeAcknowledgement)
            fixture.controller.openMovementForm()
            fixture.controller.openAccountForm()
            fixture.controller.updateLedger { it.copy(accountName = "Changed") }
            assertEquals("Keep me", fixture.controller.state.value.ledger.accountName)
            assertEquals(warning, fixture.controller.state.value.ledger.message)
            assertTrue(fixture.controller.state.value.ledger.needsOutcomeAcknowledgement)
            assertEquals(1, fixture.port.accountWrites.size)
        } finally { fixture.close() }
    }

    @Test fun activityReadFailurePreservesConfirmedWriteAndRetryIsReadOnly() = runBlocking {
        val fixture = Fixture(transactionsFailure = IllegalStateException("offline"))
        try {
            fixture.controller.openAccountForm()
            fixture.controller.updateLedger { it.copy(accountName = "A", openingBalance = "0") }
            fixture.controller.submitAccount()
            val saved = fixture.controller.state.value.ledger
            assertTrue(saved.confirmedWrite)
            assertEquals(LedgerMessageKind.RefreshFailure, saved.messageKind)
            assertTrue(saved.message.orEmpty().startsWith("Guardado; no pudimos actualizar"))
            assertEquals(1, fixture.port.accountWrites.size)
            val writes = fixture.port.accountWrites.size
            fixture.controller.retryWallet()
            assertEquals(writes, fixture.port.accountWrites.size)
            assertEquals(true, fixture.controller.state.value.ledger.confirmedWrite)
            assertEquals(LedgerMessageKind.Success, fixture.controller.state.value.ledger.messageKind)
        } finally { fixture.close() }
    }

    @Test fun malformedAccountValuesAndBlankNamesNeverWrite() = runBlocking {
        val fixture = Fixture()
        try {
            fixture.controller.openAccountForm()
            fixture.controller.updateLedger { it.copy(accountName = " ", accountType = "bogus", accountCurrency = "EUR") }
            fixture.controller.submitAccount()
            assertTrue(fixture.controller.state.value.ledger.messageKind == LedgerMessageKind.Validation)
            assertTrue(fixture.port.accountWrites.isEmpty())
            fixture.controller.updateLedger { it.copy(accountName = "A", accountType = "bogus", accountCurrency = "EUR") }
            fixture.controller.submitAccount()
            assertTrue(fixture.port.accountWrites.isEmpty())
        } finally { fixture.close() }
    }

    @Test fun duplicateMovementSubmitWhileWriteIsBlockedWritesOnceAndRefreshesOnce() = runBlocking {
        val gate = CompletableDeferred<Unit>()
        val started = CompletableDeferred<Unit>()
        val port = LifecyclePort(writeGate = gate, writeStarted = started)
        val scope = CoroutineScope(Dispatchers.Unconfined + SupervisorJob())
        val controller = WalletSessionController(port, scope)
        try {
            controller.start()
            controller.openMovementForm("initial-account")
            controller.updateLedger { it.copy(amount = "99999999999999.123456", direction = "Expense", description = "Exact movement") }
            controller.submitMovement()
            started.await()
            controller.submitMovement()
            controller.openAccountForm()
            controller.openMovementForm("acct-1")
            assertEquals(listOf("initial-account|99999999999999.123456|Expense|Exact movement"), port.movementWrites)
            assertTrue(controller.state.value.ledger.busy)
            gate.complete(Unit)
            assertTrue(controller.state.value.ledger.confirmedWrite)
            controller.submitMovement() // queued after completion while form is closed
            assertEquals(1, port.movementWrites.size)
            assertFalse(controller.state.value.ledger.movementFormOpen)
            assertEquals(2, port.accountReads) // restore plus exactly one post-write refresh
            assertEquals(2, port.activityReads)
            assertEquals(Money.of("1.00", "BOB"), controller.state.value.accounts.single().balance)
        } finally { scope.cancel() }
    }

    @Test fun unauthorizedMovementWriteHidesPrivateStateUntilSecureClearCompletes() = runBlocking {
        val clearGate = CompletableDeferred<Unit>()
        val clearStarted = CompletableDeferred<Unit>()
        val port = LifecyclePort(writeFailure = UnauthorizedSessionException(), clearGate = clearGate, clearStarted = clearStarted)
        val scope = CoroutineScope(Dispatchers.Unconfined + SupervisorJob())
        val controller = WalletSessionController(port, scope)
        try {
            controller.start()
            controller.openMovementForm("acct-1")
            controller.updateLedger { it.copy(amount = "2", direction = "Income", description = "401") }
            controller.submitMovement()
            clearStarted.await()
            assertEquals(AuthState.SigningOut, controller.state.value.auth)
            assertTrue(controller.state.value.accounts.isEmpty())
            assertFalse(controller.state.value.ledger.movementFormOpen)
            controller.login { LoginResult.Success("blocked-token") }
            controller.start()
            assertEquals(0, port.loginCalls)
            clearGate.complete(Unit)
            assertEquals(AuthState.SignedOut, controller.state.value.auth)
            controller.login { LoginResult.Success("next-token") }
            assertTrue(controller.state.value.auth is AuthState.Authenticated)
            assertEquals(1, port.loginCalls)
        } finally { scope.cancel() }
    }

    @Test fun logoutDuringPendingMovementWritePreventsOldCompletionCrossingIntoNextLogin() = runBlocking {
        val writeGate = CompletableDeferred<Unit>()
        val writeStarted = CompletableDeferred<Unit>()
        val clearStarted = CompletableDeferred<Unit>()
        val clearGate = CompletableDeferred<Unit>()
        val port = LifecyclePort(writeGate, writeStarted, clearGate = clearGate, clearStarted = clearStarted)
        val scope = CoroutineScope(Dispatchers.Unconfined + SupervisorJob())
        val controller = WalletSessionController(port, scope)
        try {
            controller.start()
            controller.openMovementForm("initial-account")
            controller.updateLedger { it.copy(amount = "3", direction = "Expense", description = "old identity") }
            controller.submitMovement()
            writeStarted.await()
            controller.logout()
            assertEquals(AuthState.SigningOut, controller.state.value.auth)
            assertTrue(controller.state.value.accounts.isEmpty())
            controller.login { LoginResult.Success("new-token") }
            assertEquals(0, port.loginCalls)
            writeGate.complete(Unit)
            clearStarted.await()
            assertEquals(0, port.loginCalls)
            assertFalse(controller.state.value.ledger.confirmedWrite)
            clearGate.complete(Unit)
            assertEquals(AuthState.SignedOut, controller.state.value.auth)
            controller.login { LoginResult.Success("new-token") }
            assertTrue(controller.state.value.auth is AuthState.Authenticated)
            assertEquals(1, port.loginCalls)
            assertEquals("initial-account|3|Expense|old identity", port.movementWrites.single())
            assertEquals("new-user", controller.state.value.accounts.single().id)
        } finally { scope.cancel() }
    }

    @Test fun staleTransactionsFromInitialReadCannotReplacePostWriteActivity() = runBlocking {
        val staleGate = CompletableDeferred<List<WalletTransaction>>()
        val staleStarted = CompletableDeferred<Unit>()
        val port = LifecyclePort(staleTransactions = staleGate, staleStarted = staleStarted)
        val scope = CoroutineScope(Dispatchers.Unconfined + SupervisorJob())
        val controller = WalletSessionController(port, scope)
        try {
            controller.start()
            staleStarted.await()
            assertEquals("initial-account", controller.state.value.accounts.single().id)
            controller.openMovementForm("acct-1")
            controller.updateLedger { it.copy(amount = "4", direction = "Income", description = "new activity") }
            controller.submitMovement()
            assertEquals(listOf("fresh-transaction"), controller.state.value.transactions.map { it.id })
            staleGate.complete(listOf(transaction("stale-transaction")))
            assertEquals(listOf("fresh-transaction"), controller.state.value.transactions.map { it.id })
            assertTrue(controller.state.value.ledger.confirmedWrite)
            controller.retryWallet()
            assertEquals(1, port.movementWrites.size)
            assertEquals(1, port.transactionWriteCalls)
        } finally { scope.cancel() }
    }

    @Test fun cancellingReversalConfirmationDoesNotPostAndGatedDuplicatePostsOnceThenRefreshesOnce() = runBlocking {
        val gate = CompletableDeferred<Unit>()
        val started = CompletableDeferred<Unit>()
        val port = ReversalPort(writeGate = gate, writeStarted = started)
        val scope = CoroutineScope(Dispatchers.Unconfined + SupervisorJob())
        val controller = WalletSessionController(port, scope)
        try {
            controller.start()
            controller.openReversalForm("original-id")
            assertTrue(controller.state.value.ledger.reversalFormOpen)
            controller.updateLedger { it.copy(reversalReason = "  Duplicado  ") }
            controller.updateLedger { it.copy(reversalFormOpen = false) }
            assertTrue(port.reversals.isEmpty())
            controller.openReversalForm("original-id")
            controller.updateLedger { it.copy(reversalReason = "  Duplicado  ") }
            controller.submitReversal()
            started.await()
            controller.submitReversal()
            assertEquals(listOf("original-id|Duplicado"), port.reversals)
            assertTrue(controller.state.value.ledger.busy)
            gate.complete(Unit)
            assertTrue(controller.state.value.ledger.confirmedWrite)
            assertEquals(2, port.accountReads)
            assertEquals(2, port.activityReads)
            assertEquals(1, port.reversals.size)
            controller.submitReversal()
            assertEquals(1, port.reversals.size)
        } finally { scope.cancel() }
    }

    @Test fun reversalRequiresCurrentListedOriginalAndMatchingConfirmationForm() = runBlocking {
        val port = ReversalPort()
        val scope = CoroutineScope(Dispatchers.Unconfined + SupervisorJob())
        val controller = WalletSessionController(port, scope)
        try {
            controller.start()
            controller.openReversalForm("not-present")
            assertFalse(controller.state.value.ledger.reversalFormOpen)
            controller.openMovementForm("acct-1")
            controller.submitReversal()
            assertTrue(port.reversals.isEmpty())
        } finally { scope.cancel() }
    }

    @Test fun reversalConflictIsDefinitiveAndUnknownOutcomeBlocksOtherFormsWithoutRetry() = runBlocking {
        val conflictPort = ReversalPort(writeFailure = WalletApiException(409))
        val conflictController = controllerFor(conflictPort)
        try {
            conflictController.controller.openReversalForm("original-id")
            conflictController.controller.submitReversal()
            val ledger = conflictController.controller.state.value.ledger
            assertEquals(LedgerMessageKind.DefinitiveFailure, ledger.messageKind)
            assertTrue(ledger.message.orEmpty().contains("El movimiento ya fue revertido"))
            assertFalse(ledger.needsOutcomeAcknowledgement)
            assertTrue(ledger.reversalFormOpen)
            assertEquals(1, conflictPort.reversals.size)
        } finally { conflictController.close() }

        val unknownPort = ReversalPort(writeFailure = WalletApiException(503))
        val unknownController = controllerFor(unknownPort)
        try {
            unknownController.controller.openReversalForm("original-id")
            unknownController.controller.submitReversal()
            val ledger = unknownController.controller.state.value.ledger
            assertEquals(LedgerMessageKind.UnknownOutcome, ledger.messageKind)
            assertTrue(ledger.needsOutcomeAcknowledgement)
            unknownController.controller.openAccountForm()
            unknownController.controller.submitReversal()
            assertTrue(unknownController.controller.state.value.ledger.needsOutcomeAcknowledgement)
            assertEquals(1, unknownPort.reversals.size)
        } finally { unknownController.close() }
    }

    @Test fun unauthorizedReversalUsesExistingLogoutCleanup() = runBlocking {
        val port = ReversalPort(writeFailure = UnauthorizedSessionException())
        val fixture = controllerFor(port)
        try {
            fixture.controller.openReversalForm("original-id")
            fixture.controller.submitReversal()
            assertEquals(AuthState.SignedOut, fixture.controller.state.value.auth)
            assertTrue(fixture.controller.state.value.transactions.isEmpty())
            assertEquals(1, port.reversals.size)
        } finally { fixture.close() }
    }

    private fun controllerFor(port: ReversalPort): FixtureHolder {
        val scope = CoroutineScope(Dispatchers.Unconfined + SupervisorJob())
        val controller = WalletSessionController(port, scope)
        controller.start()
        return FixtureHolder(controller, scope)
    }

    private data class FixtureHolder(val controller: WalletSessionController, private val scope: CoroutineScope) {
        fun close() = scope.cancel()
    }

    private class ReversalPort(
        private val writeGate: CompletableDeferred<Unit>? = null,
        private val writeStarted: CompletableDeferred<Unit>? = null,
        private val writeFailure: Exception? = null
    ) : WalletSessionPort {
        val reversals = mutableListOf<String>()
        var accountReads = 0
        var activityReads = 0
        override suspend fun hasSession() = true
        override suspend fun login(googleIdToken: String) = LoginResult.Success(googleIdToken)
        override suspend fun clearSession() = Unit
        override suspend fun loadAccounts(): List<AccountDto> {
            accountReads++
            return listOf(AccountDto("acct-1", "Cuenta", "Bank", "BOB", Money.of("1", "BOB"), "today"))
        }
        override suspend fun loadRecentTransactions(): List<WalletTransaction> {
            activityReads++
            return listOf(transaction("original-id"))
        }
        override suspend fun loadRate() = RateSnapshotDto("1", "test", "today", false)
        override suspend fun reverseTransaction(transactionId: String, reason: String?) {
            reversals += "$transactionId|${reason.orEmpty()}"
            writeStarted?.complete(Unit)
            writeGate?.await()
            writeFailure?.let { throw it }
        }
    }

    private class LifecyclePort(
        private val writeGate: CompletableDeferred<Unit>? = null,
        private val writeStarted: CompletableDeferred<Unit>? = null,
        private val writeFailure: Exception? = null,
        private val clearGate: CompletableDeferred<Unit>? = null,
        private val clearStarted: CompletableDeferred<Unit>? = null,
        private val staleTransactions: CompletableDeferred<List<WalletTransaction>>? = null,
        private val staleStarted: CompletableDeferred<Unit>? = null
    ) : WalletSessionPort {
        val movementWrites = mutableListOf<String>()
        var accountReads = 0
        var activityReads = 0
        var loginCalls = 0
        var transactionWriteCalls = 0
        override suspend fun hasSession() = true
        override suspend fun login(googleIdToken: String): LoginResult { loginCalls++; return LoginResult.Success(googleIdToken) }
        override suspend fun clearSession() { clearStarted?.complete(Unit); clearGate?.await() }
        override suspend fun loadAccounts(): List<AccountDto> {
            accountReads++
            return listOf(AccountDto(if (accountReads == 1) "initial-account" else "new-user", "Fixture", "Bank", "BOB", Money.of("1.00", "BOB"), "today"))
        }
        override suspend fun loadRecentTransactions(): List<WalletTransaction> {
            activityReads++
            if (activityReads == 1 && staleTransactions != null) {
                staleStarted?.complete(Unit)
                return withContext(NonCancellable) { staleTransactions.await() }
            }
            return if (activityReads > 1) listOf(transaction("fresh-transaction")) else emptyList()
        }
        override suspend fun loadRate() = RateSnapshotDto("1", "test", "today", false)
        override suspend fun registerTransaction(accountId: String, amount: String, direction: String, description: String?) {
            transactionWriteCalls++
            movementWrites += "$accountId|$amount|$direction|$description"
            writeStarted?.complete(Unit)
            writeGate?.await()
            writeFailure?.let { throw it }
        }
        override suspend fun createAccount(name: String, type: String, currency: String, openingBalance: String) = Unit
    }

    private class Fixture(
        private val writeFailure: Exception? = null,
        private val transactionsFailure: Exception? = null
    ) {
        private val scope = CoroutineScope(Dispatchers.Unconfined + SupervisorJob())
        val port = Port(writeFailure, transactionsFailure)
        val controller = WalletSessionController(port, scope)
        init { controller.start() }
        fun close() { scope.cancel() }
    }

private class Port(
        private val writeFailure: Exception?,
        private val transactionsFailure: Exception?
    ) : WalletSessionPort {
        val accountWrites = mutableListOf<String>()
        private var activityReadCalls = 0
        override suspend fun hasSession() = true
        override suspend fun login(googleIdToken: String) = LoginResult.Success(googleIdToken)
        override suspend fun clearSession() = Unit
        override suspend fun loadAccounts() = listOf(AccountDto("1", "Cuenta", "Bank", "BOB", Money.of("1", "BOB"), "today"))
        override suspend fun loadRecentTransactions(): List<WalletTransaction> {
            activityReadCalls++
            if (activityReadCalls == 2) transactionsFailure?.let { throw it }
            return emptyList()
        }
        override suspend fun loadRate() = RateSnapshotDto("1", "test", "today", false)
        override suspend fun createAccount(name: String, type: String, currency: String, openingBalance: String) {
            accountWrites += "$name|$type|$currency|$openingBalance"
            writeFailure?.let { throw it }
        }
    }
}

private fun transaction(id: String) = WalletTransaction(id, "acct-1", Money.of("1.00", "BOB"), "Income", null, "today", "test", null, null, null, null, "today")
