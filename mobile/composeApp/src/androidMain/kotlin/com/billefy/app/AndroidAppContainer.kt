package com.billefy.app

import android.content.Context
import com.billefy.app.auth.GoogleIdTokenProvider
import com.billefy.app.auth.GoogleTokenResult
import com.billefy.app.config.AndroidAppConfig
import com.billefy.shared.api.KtorHttpTransport
import com.billefy.shared.auth.AndroidSessionStore
import com.billefy.shared.auth.SessionManager
import com.billefy.shared.wallet.WalletApi
import com.billefy.shared.wallet.WalletApiException
import com.billefy.app.state.LoginResult
import com.billefy.app.state.UnauthorizedSessionException
import com.billefy.app.state.WalletSessionController
import com.billefy.app.state.WalletSessionPort
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

class AndroidAppContainer(context: Context) {
    private val applicationContext = context.applicationContext
    val config: AndroidAppConfig? = runCatching { AndroidAppConfig.fromBuildConfig() }.getOrNull()
    val configError: String? = if (config == null) "Configura billefy.api.baseUrl y billefy.google.serverClientId en mobile/local.properties. No agregues secretos." else null
    private val client: HttpClient? = config?.let { HttpClient(Android) }
    private val sessionStore = AndroidSessionStore(applicationContext)
    private val sessionManager: SessionManager? = config?.let { SessionManager(it.apiBaseUrl, KtorHttpTransport(client!!), sessionStore) }
    val controller: WalletSessionController? = sessionManager?.let { session ->
        val wallet = WalletApi(session)
        WalletSessionController(object : WalletSessionPort {
            override suspend fun hasSession() = sessionStore.load() != null
            override suspend fun login(googleIdToken: String): LoginResult = try {
                val response = session.loginWithGoogle(googleIdToken)
                if (response.status in 200..299) LoginResult.Success(googleIdToken)
                else LoginResult.Failure("El servidor rechazó el inicio de sesión (${response.status}).")
            } catch (cancelled: CancellationException) { throw cancelled }
            catch (_: Exception) { LoginResult.Failure("No se pudo conectar para iniciar sesión.") }
            override suspend fun clearSession() {
                try { session.logout() } finally { session.clearLocalSession() }
            }
            private suspend fun <T> authorizedRead(read: suspend () -> T): T = try { read() } catch (error: WalletApiException) {
                if (error.status == 401) throw UnauthorizedSessionException()
                throw error
            }
            override suspend fun loadAccounts() = authorizedRead { wallet.getAccounts() }
            override suspend fun loadRecentTransactions() = authorizedRead { wallet.getTransactions(limit = 20) }
            override suspend fun loadRate() = authorizedRead { wallet.getLatestRate("BOB") }
            override suspend fun createAccount(name: String, type: String, currency: String, openingBalance: String) {
                authorizedRead { wallet.createAccount(name, type, currency, openingBalance) }
            }
            override suspend fun registerTransaction(accountId: String, amount: String, direction: String, description: String?) {
                authorizedRead { wallet.registerTransaction(accountId, amount, direction, description) }
            }
            override suspend fun reverseTransaction(transactionId: String, reason: String?) {
                authorizedRead { wallet.reverseTransaction(transactionId, reason) }
            }
        }, CoroutineScope(SupervisorJob() + Dispatchers.IO))
    }

    fun googleProvider(): GoogleIdTokenProvider? = config?.let { GoogleIdTokenProvider(it.googleServerClientId) }
    fun close() { client?.close() }
}
