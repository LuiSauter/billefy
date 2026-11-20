package com.billefy.app.state

import com.billefy.shared.model.AccountDto
import com.billefy.shared.model.RateSnapshotDto
import com.billefy.shared.wallet.WalletTransaction
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

sealed interface AuthState {
    data object CheckingSession : AuthState
    data object SessionUnverified : AuthState
    data object SignedOut : AuthState
    data object SigningIn : AuthState
    data object SigningOut : AuthState
    data object SignOutFailed : AuthState
    data class Authenticated(val userLabel: String? = null) : AuthState
}

sealed interface LoginResult {
    data class Success(val idToken: String) : LoginResult
    data object Cancelled : LoginResult
    data class Failure(val message: String) : LoginResult
}

data class WalletUiState(
    val auth: AuthState = AuthState.CheckingSession,
    val accounts: List<AccountDto> = emptyList(),
    val transactions: List<WalletTransaction> = emptyList(),
    val rate: RateSnapshotDto? = null,
    val walletLoading: Boolean = false,
    val walletError: String? = null,
    val activityError: String? = null,
    val rateError: String? = null,
    val authError: String? = null,
    val ledger: LedgerActionState = LedgerActionState()
)

interface WalletSessionPort {
    suspend fun hasSession(): Boolean
    suspend fun login(googleIdToken: String): LoginResult
    suspend fun clearSession()
    suspend fun loadAccounts(): List<AccountDto>
    suspend fun loadRecentTransactions(): List<WalletTransaction>
    suspend fun loadRate(): RateSnapshotDto
    suspend fun createAccount(name: String, type: String, currency: String, openingBalance: String) { error("Account writes are unavailable") }
    suspend fun registerTransaction(accountId: String, amount: String, direction: String, description: String?) { error("Transaction writes are unavailable") }
    suspend fun reverseTransaction(transactionId: String, reason: String?) { error("Transaction reversals are unavailable") }
}

class UnauthorizedSessionException : IllegalStateException()

/** State is actor-confined; auth persistence is serialized separately from cancellable wallet reads. */
class WalletSessionController(
    private val port: WalletSessionPort,
    private val background: CoroutineScope
) {
    private val mutableState = MutableStateFlow(WalletUiState())
    val state: StateFlow<WalletUiState> = mutableState.asStateFlow()

    private val events = Channel<Event>(Channel.UNLIMITED)
    private val authMutex = Mutex()
    private var epoch = 0L
    private var readSequence = 0L
    private var activeRead = 0L
    private var clearSequence = 0L
    private var latestClear = 0L
    private var pendingClearFailure = false
    private var walletJob: Job? = null
    private var started = false

    init { background.launch { for (event in events) handle(event) } }

    fun start() { events.trySend(Event.Start) }
    fun login(tokenProvider: suspend () -> LoginResult) { events.trySend(Event.Login(tokenProvider)) }
    fun logout() { events.trySend(Event.Logout) }
    fun retryWallet() { events.trySend(Event.Retry) }
    fun openAccountForm() { events.trySend(Event.OpenAccountForm) }
    fun openMovementForm(accountId: String? = null) { events.trySend(Event.OpenMovementForm(accountId)) }
    fun openReversalForm(transactionId: String) { events.trySend(Event.OpenReversalForm(transactionId)) }
    fun updateLedger(transform: (LedgerActionState) -> LedgerActionState) { events.trySend(Event.UpdateLedger(transform)) }
    fun submitAccount() { events.trySend(Event.SubmitAccount) }
    fun submitMovement() { events.trySend(Event.SubmitMovement) }
    fun submitReversal() { events.trySend(Event.SubmitReversal) }
    fun acknowledgeUnknownOutcome() { events.trySend(Event.AcknowledgeUnknownOutcome) }
    fun refreshAfterLedgerAction() { events.trySend(Event.RefreshAfterLedgerAction) }

    private suspend fun handle(event: Event) {
        when (event) {
            Event.Start -> {
                if (started || mutableState.value.auth != AuthState.CheckingSession) return
                started = true
                val request = advanceEpoch()
                mutableState.value = WalletUiState(auth = AuthState.CheckingSession)
                background.launch {
                    try {
                        if (!isCurrent(request)) return@launch
                        val exists = port.hasSession()
                        events.send(Event.RestoreFinished(request, exists, null))
                    } catch (cancelled: CancellationException) { throw cancelled }
                    catch (failure: Exception) { events.send(Event.RestoreFinished(request, false, failure)) }
                }
            }
            is Event.RestoreFinished -> if (event.epoch == epoch) {
                when {
                    event.error != null -> mutableState.value = WalletUiState(auth = AuthState.SignedOut, authError = "No se pudo comprobar la sesión. Intenta iniciar sesión.")
                    !event.exists -> mutableState.value = WalletUiState(auth = AuthState.SignedOut)
                    else -> beginWalletRead(event.epoch, restoring = true)
                }
            }
            is Event.Login -> {
                if (mutableState.value.auth !in setOf(
                        AuthState.SignedOut, AuthState.CheckingSession
                    )) return
                val request = advanceEpoch()
                started = true
                walletJob?.cancel()
                mutableState.value = WalletUiState(auth = AuthState.SigningIn)
                background.launch {
                    val result = try { event.tokenProvider() }
                    catch (cancelled: CancellationException) { throw cancelled }
                    catch (_: Exception) { LoginResult.Failure("No se pudo obtener la credencial de Google.") }
                    events.send(Event.CredentialFinished(request, result))
                }
            }
            is Event.CredentialFinished -> if (event.epoch == epoch) {
                when (val result = event.result) {
                    LoginResult.Cancelled -> publishSignedOut()
                    is LoginResult.Failure -> publishSignedOut(result.message)
                    is LoginResult.Success -> {
                        mutableState.value = WalletUiState(auth = AuthState.CheckingSession)
                        background.launch {
                            try {
                                val exchange = authMutex.withLock {
                                    if (!isCurrent(event.epoch)) return@launch
                                    port.login(result.idToken)
                                }
                                events.send(Event.ExchangeFinished(event.epoch, exchange, null))
                            } catch (cancelled: CancellationException) { throw cancelled }
                            catch (failure: Exception) { events.send(Event.ExchangeFinished(event.epoch, null, failure)) }
                        }
                    }
                }
            }
            is Event.ExchangeFinished -> if (event.epoch == epoch) {
                when {
                    event.error != null -> publishSignedOut("No se pudo iniciar sesión. Intenta de nuevo.")
                    event.result is LoginResult.Success -> {
                        pendingClearFailure = false
                        beginWalletRead(event.epoch, restoring = true)
                    }
                    else -> publishSignedOut((event.result as? LoginResult.Failure)?.message)
                }
            }
            Event.Logout -> beginSignOut()
            is Event.SignOutFinished -> if (event.clearId == latestClear) {
                pendingClearFailure = event.error != null
                if (event.error != null && mutableState.value.auth !is AuthState.Authenticated) {
                    mutableState.value = WalletUiState(auth = AuthState.SignOutFailed, authError = CLEAR_FAILURE)
                } else if (event.epoch == epoch && event.error == null) {
                    mutableState.value = WalletUiState(auth = AuthState.SignedOut)
                }
            }
            Event.OpenAccountForm -> if (mutableState.value.auth is AuthState.Authenticated && !mutableState.value.ledger.busy && !mutableState.value.ledger.needsOutcomeAcknowledgement) {
                mutableState.value = mutableState.value.copy(ledger = LedgerActionState(accountFormOpen = true))
            }
            is Event.OpenReversalForm -> if (mutableState.value.auth is AuthState.Authenticated && !mutableState.value.ledger.busy && !mutableState.value.ledger.needsOutcomeAcknowledgement) {
                val transactions = mutableState.value.transactions
                val selected = transactions.firstOrNull { it.id == event.transactionId }
                val alreadyReversed = transactions.any { it.reversesId == event.transactionId }
                if (selected != null && selected.reversesId == null && !alreadyReversed) {
                    mutableState.value = mutableState.value.copy(ledger = LedgerActionState(reversalFormOpen = true, selectedTransactionId = selected.id))
                }
            }
            is Event.OpenMovementForm -> if (mutableState.value.auth is AuthState.Authenticated && !mutableState.value.ledger.busy && !mutableState.value.ledger.needsOutcomeAcknowledgement) {
                val accountId = event.accountId?.takeIf { id -> mutableState.value.accounts.any { it.id == id } }
                    ?: mutableState.value.accounts.firstOrNull()?.id
                if (accountId != null) mutableState.value = mutableState.value.copy(ledger = LedgerActionState(movementFormOpen = true, selectedAccountId = accountId))
            }
            is Event.UpdateLedger -> if (mutableState.value.auth is AuthState.Authenticated && !mutableState.value.ledger.busy && !mutableState.value.ledger.needsOutcomeAcknowledgement) {
                mutableState.value = mutableState.value.copy(ledger = event.transform(mutableState.value.ledger))
            }
            Event.SubmitAccount -> submitAccountAction()
            Event.SubmitMovement -> submitMovementAction()
            Event.SubmitReversal -> submitReversalAction()
            Event.AcknowledgeUnknownOutcome -> if (mutableState.value.ledger.needsOutcomeAcknowledgement && !mutableState.value.ledger.busy) {
                mutableState.value = mutableState.value.copy(ledger = mutableState.value.ledger.copy(needsOutcomeAcknowledgement = false, message = null, messageKind = null))
            }
            Event.RefreshAfterLedgerAction -> if (!mutableState.value.ledger.busy && mutableState.value.auth is AuthState.Authenticated) {
                beginWalletRead(epoch, restoring = false)
            }
            Event.Retry -> when (mutableState.value.auth) {
                is AuthState.Authenticated -> beginWalletRead(epoch, restoring = false)
                AuthState.SessionUnverified -> beginWalletRead(epoch, restoring = true)
                AuthState.SignOutFailed -> beginSignOut()
                else -> Unit
            }
            is Event.AccountsFinished -> if (isCurrentRead(event.epoch, event.readId)) {
                if (event.error is UnauthorizedSessionException) beginSignOut()
                else if (event.error != null) {
                    val wasAuthenticated = mutableState.value.auth is AuthState.Authenticated
                    mutableState.value = mutableState.value.copy(
                        auth = if (wasAuthenticated) AuthState.Authenticated() else AuthState.SessionUnverified,
                        walletLoading = false,
                        walletError = "No se pudo cargar la billetera. Comprueba tu conexión e inténtalo de nuevo.",
                        ledger = mutableState.value.ledger.let { ledger ->
                            if (ledger.confirmedWrite) ledger.copy(message = "Guardado; no pudimos actualizar tus cuentas/movimientos. Reintenta solo la actualización.", messageKind = LedgerMessageKind.RefreshFailure)
                            else ledger
                        }
                    )
                } else {
                    mutableState.value = mutableState.value.copy(
                        auth = AuthState.Authenticated(), accounts = event.accounts.orEmpty(),
                        walletLoading = false, walletError = null, activityError = null, rateError = null,
                        ledger = mutableState.value.ledger.let { ledger ->
                            ledger
                        }
                    )
                    startSecondaryReads(event.epoch, event.readId)
                }
            }
            is Event.TransactionsFinished -> if (isCurrentRead(event.epoch, event.readId)) {
                if (event.error is UnauthorizedSessionException) beginSignOut()
                else if (event.error != null) {
                    mutableState.value = mutableState.value.copy(
                        activityError = "No se pudo cargar la actividad reciente.",
                        ledger = mutableState.value.ledger.let { ledger ->
                            if (ledger.confirmedWrite) ledger.copy(message = "Guardado; no pudimos actualizar tus cuentas/movimientos. Reintenta solo la actualización.", messageKind = LedgerMessageKind.RefreshFailure) else ledger
                        }
                    )
                } else {
                    mutableState.value = mutableState.value.copy(
                        transactions = event.transactions.orEmpty(), activityError = null,
                        ledger = mutableState.value.ledger.let { ledger ->
                            if (ledger.confirmedWrite && mutableState.value.walletError == null) ledger.copy(message = "Guardado.", messageKind = LedgerMessageKind.Success) else ledger
                        }
                    )
                }
            }
            is Event.LedgerWriteFinished -> if (event.epoch == epoch && mutableState.value.auth is AuthState.Authenticated) {
                val current = mutableState.value.ledger
                if (event.error is UnauthorizedSessionException) beginSignOut()
                else if (event.error != null) {
                    val conflict = event.reversal && (event.error as? com.billefy.shared.wallet.WalletApiException)?.status == 409
                    mutableState.value = mutableState.value.copy(ledger = current.copy(
                        busy = false,
                        message = when {
                            conflict -> "El movimiento ya fue revertido. Actualizá la actividad antes de continuar."
                            event.unknown && event.reversal -> "No pudimos confirmar la reversión. Actualizá y revisá la actividad antes de volver a intentar."
                            event.unknown -> "No pudimos confirmar el resultado. Actualizá y revisá tus cuentas/movimientos antes de volver a registrar."
                            else -> "No se pudo guardar. Revisa los datos e inténtalo de nuevo."
                        },
                        messageKind = if (event.unknown) LedgerMessageKind.UnknownOutcome else LedgerMessageKind.DefinitiveFailure,
                        needsOutcomeAcknowledgement = event.unknown
                    ))
                } else {
                    mutableState.value = mutableState.value.copy(ledger = LedgerActionState(confirmedWrite = true, message = if (event.reversal) "Reversión confirmada." else "Guardado.", messageKind = LedgerMessageKind.Success))
                    beginWalletRead(event.epoch, restoring = false)
                }
            }
            is Event.RateFinished -> if (isCurrentRead(event.epoch, event.readId)) {
                if (event.error is UnauthorizedSessionException) beginSignOut()
                else if (event.error != null) mutableState.value = mutableState.value.copy(rateError = "Tipo de cambio no disponible.")
                else mutableState.value = mutableState.value.copy(rate = event.rate, rateError = null)
            }
        }
    }

    private fun submitAccountAction() {
        val state = mutableState.value
        val form = state.ledger
        if (state.auth !is AuthState.Authenticated || form.busy || form.needsOutcomeAcknowledgement) return
        val validation = when {
            !form.accountFormOpen || form.movementFormOpen -> "Abre el formulario de cuenta para continuar."
            form.accountName.isBlank() -> "Escribe el nombre de la cuenta."
            form.accountType !in ACCOUNT_TYPES -> "Selecciona un tipo de cuenta válido."
            form.accountCurrency !in CURRENCIES -> "Selecciona una moneda válida."
            validateDecimalInput(form.openingBalance, allowNegative = true) != null -> validateDecimalInput(form.openingBalance, true)
            else -> null
        }
        if (validation != null) { mutableState.value = state.copy(ledger = form.copy(message = validation, messageKind = LedgerMessageKind.Validation)); return }
        runLedgerWrite(form) { port.createAccount(form.accountName, form.accountType, form.accountCurrency, form.openingBalance) }
    }

    private fun submitMovementAction() {
        val state = mutableState.value
        val form = state.ledger
        if (state.auth !is AuthState.Authenticated || form.busy || form.needsOutcomeAcknowledgement) return
        val validation = when {
            !form.movementFormOpen || form.accountFormOpen -> "Abre el formulario de movimiento para continuar."
            state.accounts.none { it.id == form.selectedAccountId } -> "Selecciona una cuenta disponible."
            form.direction !in setOf("Income", "Expense") -> "Selecciona ingreso o gasto."
            validateDecimalInput(form.amount, allowNegative = false) != null -> validateDecimalInput(form.amount, false)
            else -> null
        }
        if (validation != null) { mutableState.value = state.copy(ledger = form.copy(message = validation, messageKind = LedgerMessageKind.Validation)); return }
        runLedgerWrite(form) { port.registerTransaction(form.selectedAccountId!!, form.amount, form.direction, form.description) }
    }

    private fun submitReversalAction() {
        val state = mutableState.value
        val form = state.ledger
        val transactionId = form.selectedTransactionId
        val selected = state.transactions.firstOrNull { it.id == transactionId }
        val alreadyReversed = state.transactions.any { it.reversesId == transactionId }
        if (state.auth !is AuthState.Authenticated || form.busy || form.needsOutcomeAcknowledgement) return
        if (!form.reversalFormOpen || transactionId == null || selected == null || selected.reversesId != null || alreadyReversed) return
        runLedgerWrite(form, reversal = true) { port.reverseTransaction(transactionId, form.reversalReason.trim().takeIf { it.isNotEmpty() }) }
    }

    private fun runLedgerWrite(form: LedgerActionState, reversal: Boolean = false, write: suspend () -> Unit) {
        val request = epoch
        mutableState.value = mutableState.value.copy(ledger = form.copy(busy = true, message = null, messageKind = null))
        background.launch {
            try {
                authMutex.withLock { if (!isCurrent(request)) return@launch; write() }
                events.send(Event.LedgerWriteFinished(request, null, false, reversal))
            } catch (cancelled: CancellationException) { throw cancelled }
            catch (failure: Exception) {
                val apiFailure = failure as? com.billefy.shared.wallet.WalletApiException
                val definitive = apiFailure != null && apiFailure.status in 400..499 && apiFailure.status != 401
                events.send(Event.LedgerWriteFinished(request, failure, !definitive, reversal))
            }
        }
    }

    private fun beginWalletRead(request: Long, restoring: Boolean) {
        if (request != epoch) return
        walletJob?.cancel()
        val readId = ++readSequence
        activeRead = readId
        val current = mutableState.value
        mutableState.value = current.copy(
            auth = if (restoring && current.auth !is AuthState.Authenticated) AuthState.CheckingSession else current.auth,
            walletLoading = true, walletError = null, activityError = null, rateError = null
        )
        walletJob = background.launch {
            val result = try { port.loadAccounts() to null }
            catch (cancelled: CancellationException) { throw cancelled }
            catch (failure: Exception) { null to failure }
            events.send(Event.AccountsFinished(request, readId, result.first, result.second))
        }
    }

    private fun startSecondaryReads(request: Long, readId: Long) {
        background.launch {
            val result = try { port.loadRecentTransactions() to null }
            catch (cancelled: CancellationException) { throw cancelled }
            catch (failure: Exception) { null to failure }
            events.send(Event.TransactionsFinished(request, readId, result.first, result.second))
        }
        background.launch {
            val result = try { port.loadRate() to null }
            catch (cancelled: CancellationException) { throw cancelled }
            catch (failure: Exception) { null to failure }
            events.send(Event.RateFinished(request, readId, result.first, result.second))
        }
    }

    private suspend fun beginSignOut() {
        if (mutableState.value.auth == AuthState.SigningOut) return
        started = true
        val request = advanceEpoch()
        val clearId = ++clearSequence
        latestClear = clearId
        activeRead = ++readSequence
        walletJob?.cancel()
        walletJob = null
        mutableState.value = WalletUiState(auth = AuthState.SigningOut)
        background.launch {
            try {
                authMutex.withLock {
                    try {
                        port.clearSession()
                        events.send(Event.SignOutFinished(request, clearId, null))
                    } catch (cancelled: CancellationException) { throw cancelled }
                    catch (failure: Exception) { events.send(Event.SignOutFinished(request, clearId, failure)) }
                }
            } catch (cancelled: CancellationException) { throw cancelled }
            catch (failure: Exception) { events.send(Event.SignOutFinished(request, clearId, failure)) }
        }
    }

    private fun publishSignedOut(error: String? = null) {
        mutableState.value = if (pendingClearFailure) {
            WalletUiState(auth = AuthState.SignOutFailed, authError = CLEAR_FAILURE)
        } else WalletUiState(auth = AuthState.SignedOut, authError = error)
    }

    private val identityMutex = Mutex()

    private suspend fun advanceEpoch(): Long = identityMutex.withLock { ++epoch }

    private suspend fun isCurrent(request: Long): Boolean = identityMutex.withLock { request == epoch }

    private fun isCurrentRead(request: Long, readId: Long): Boolean = request == epoch && readId == activeRead

    private companion object {
        const val CLEAR_FAILURE = "No se pudo cerrar la sesión de forma segura. Reintenta."
        val ACCOUNT_TYPES = setOf("Bank", "Wallet", "Cash", "Exchange", "Savings", "Checking", "CryptoWallet", "International")
        val CURRENCIES = setOf("BOB", "USD", "USDT")
    }

    private sealed interface Event {
        data object Start : Event
        data class Login(val tokenProvider: suspend () -> LoginResult) : Event
        data object Logout : Event
        data object Retry : Event
        data object OpenAccountForm : Event
        data class OpenMovementForm(val accountId: String?) : Event
        data class OpenReversalForm(val transactionId: String) : Event
        data class UpdateLedger(val transform: (LedgerActionState) -> LedgerActionState) : Event
        data object SubmitAccount : Event
        data object SubmitMovement : Event
        data object SubmitReversal : Event
        data object AcknowledgeUnknownOutcome : Event
        data object RefreshAfterLedgerAction : Event
        data class LedgerWriteFinished(val epoch: Long, val error: Exception?, val unknown: Boolean, val reversal: Boolean = false) : Event
        data class RestoreFinished(val epoch: Long, val exists: Boolean, val error: Exception?) : Event
        data class CredentialFinished(val epoch: Long, val result: LoginResult) : Event
        data class ExchangeFinished(val epoch: Long, val result: LoginResult?, val error: Exception?) : Event
        data class SignOutFinished(val epoch: Long, val clearId: Long, val error: Exception?) : Event
        data class AccountsFinished(val epoch: Long, val readId: Long, val accounts: List<AccountDto>?, val error: Exception?) : Event
        data class TransactionsFinished(val epoch: Long, val readId: Long, val transactions: List<WalletTransaction>?, val error: Exception?) : Event
        data class RateFinished(val epoch: Long, val readId: Long, val rate: RateSnapshotDto?, val error: Exception?) : Event
    }
}
