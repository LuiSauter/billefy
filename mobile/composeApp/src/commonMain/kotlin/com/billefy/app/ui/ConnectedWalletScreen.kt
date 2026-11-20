package com.billefy.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.billefy.app.state.AuthState
import com.billefy.app.state.WalletUiState
import com.billefy.app.state.LedgerActionState
import com.billefy.shared.model.AccountDto
import com.billefy.shared.wallet.WalletTransaction

@Composable
fun ConnectedWalletScreen(state: WalletUiState, onRetry: () -> Unit, onLogout: () -> Unit, onDisclosure: () -> Unit, onOpenAccount: () -> Unit, onOpenMovement: () -> Unit, onOpenReversal: (String) -> Unit, onUpdateLedger: ((LedgerActionState) -> LedgerActionState) -> Unit, onSubmitAccount: () -> Unit, onSubmitMovement: () -> Unit, onSubmitReversal: () -> Unit, onAcknowledge: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(20.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Billefy · Billetera", style = MaterialTheme.typography.headlineSmall)
            OutlinedButton(onClick = onLogout) { Text("Cerrar sesión") }
        }
        Spacer(Modifier.height(16.dp))
        Text("Cuentas y saldos por moneda", style = MaterialTheme.typography.titleMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = onOpenAccount, enabled = !state.ledger.busy) { Text("Crear cuenta") }
            Button(onClick = onOpenMovement, enabled = !state.ledger.busy && state.accounts.isNotEmpty()) { Text("Registrar movimiento") }
        }
        when {
            state.walletLoading -> CircularProgressIndicator()
            state.walletError != null -> ErrorBlock(state.walletError, onRetry)
            state.accounts.isEmpty() -> Text("Todavía no tienes cuentas.")
            else -> LazyColumn(Modifier.weight(1f)) {
                items(state.accounts, key = AccountDto::id) { AccountRow(it) }
                item { Spacer(Modifier.height(18.dp)); Text("Actividad reciente", style = MaterialTheme.typography.titleMedium) }
                if (state.activityError != null) item { ErrorBlock(state.activityError, onRetry) }
                else if (state.transactions.isEmpty()) item { Text("No hay movimientos recientes.") }
                items(state.transactions, key = WalletTransaction::id) { transaction ->
                    val alreadyReversed = state.transactions.any { it.reversesId == transaction.id }
                    TransactionRow(transaction, onRevert = if (transaction.reversesId == null && !alreadyReversed) onOpenReversal else null)
                }
            }
        }
        LedgerEntryForms(state.ledger, state.accounts, state.transactions, onUpdateLedger, onSubmitAccount, onSubmitMovement, onSubmitReversal, onAcknowledge, onRetry)
        state.rate?.let { Text("Cambio ${it.appliedRate} · ${it.rateSource} · ${it.fetchedAt}") }
        state.rateError?.let { Text(it) }
        if (state.authError != null) Text(state.authError)
        Spacer(Modifier.height(12.dp))
        Text("Metas, presupuestos y captura se habilitarán en sus próximas entregas.")
        OutlinedButton(onClick = onDisclosure) { Text("Privacidad de notificaciones") }
    }
}

@Composable private fun AccountRow(account: AccountDto) {
    Card(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
        Column(Modifier.padding(14.dp)) {
            Text(account.name, style = MaterialTheme.typography.titleMedium)
            Text("${account.balance.displayAmount} ${account.currency} · ${account.type}")
        }
    }
}

@Composable private fun TransactionRow(transaction: WalletTransaction, onRevert: ((String) -> Unit)?) {
    Card(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Column(Modifier.padding(12.dp)) {
            Text(transaction.description ?: transaction.direction)
            Text("${transaction.amount.displayAmount} ${transaction.amount.currency} · ${transaction.occurredAt}")
            transaction.reversesId?.let { Text("Reversión de otro movimiento") }
            if (onRevert != null) OutlinedButton(onClick = { onRevert(transaction.id) }) { Text("Revertir") }
        }
    }
}

@Composable private fun ErrorBlock(message: String, retry: () -> Unit) {
    Column {
        Text(message)
        Button(onClick = retry) { Text("Reintentar lectura") }
    }
}

@Composable fun AuthStatusScreen(
    auth: AuthState,
    error: String?,
    configError: String?,
    onLogin: () -> Unit,
    onRetry: () -> Unit,
    onLogout: () -> Unit
) {
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
        Text("Billefy", style = MaterialTheme.typography.headlineLarge)
        Text("Tu billetera multimoneda")
        if (configError != null) Text(configError)
        else when (auth) {
            AuthState.CheckingSession -> CircularProgressIndicator()
            AuthState.SigningIn -> CircularProgressIndicator()
            AuthState.SignedOut -> Button(onClick = onLogin) { Text("Continuar con Google") }
            AuthState.SessionUnverified -> {
                Button(onClick = onRetry) { Text("Reintentar validación") }
                OutlinedButton(onClick = onLogout) { Text("Cerrar sesión") }
            }
            AuthState.SigningOut -> CircularProgressIndicator()
            AuthState.SignOutFailed -> {
                Button(onClick = onRetry) { Text("Reintentar cierre seguro") }
            }
            is AuthState.Authenticated -> Unit
        }
        error?.let { Text(it) }
    }
}
