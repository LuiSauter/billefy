package com.billefy.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.billefy.app.state.LedgerActionState
import com.billefy.app.state.LedgerMessageKind
import com.billefy.shared.model.AccountDto
import com.billefy.shared.wallet.WalletTransaction

@Composable
fun LedgerEntryForms(
    state: LedgerActionState,
    accounts: List<AccountDto>,
    transactions: List<WalletTransaction>,
    update: ((LedgerActionState) -> LedgerActionState) -> Unit,
    submitAccount: () -> Unit,
    submitMovement: () -> Unit,
    submitReversal: () -> Unit,
    acknowledge: () -> Unit,
    refresh: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (state.accountFormOpen) {
            Text("Crear cuenta")
            OutlinedTextField(state.accountName, { value -> update { form -> form.copy(accountName = value) } }, label = { Text("Nombre de la cuenta") }, modifier = Modifier.fillMaxWidth(), enabled = !state.busy)
            ChoiceRow("Tipo de cuenta", listOf("Bank", "Wallet", "Cash", "Exchange", "Savings", "Checking", "CryptoWallet", "International"), state.accountType, !state.busy) { update { s -> s.copy(accountType = it) } }
            ChoiceRow("Moneda", listOf("BOB", "USD", "USDT"), state.accountCurrency, !state.busy) { update { s -> s.copy(accountCurrency = it) } }
            OutlinedTextField(state.openingBalance, { value -> update { form -> form.copy(openingBalance = value) } }, label = { Text("Saldo inicial (puede ser negativo)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), enabled = !state.busy)
            Button(onClick = submitAccount, enabled = !state.busy) { Text("Guardar cuenta") }
        }
        if (state.movementFormOpen) {
            Text("Registrar movimiento")
            if (accounts.isEmpty()) Text("Crea una cuenta antes de registrar movimientos.")
            else {
                Column {
                    Text("Cuenta")
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        accounts.forEach { account -> OutlinedButton(onClick = { update { s -> s.copy(selectedAccountId = account.id) } }, enabled = !state.busy) {
                            Text((if (account.id == state.selectedAccountId) "✓ " else "") + account.name + " · " + account.currency)
                        } }
                    }
                }
                Text("Moneda del importe: ${accounts.firstOrNull { it.id == state.selectedAccountId }?.currency ?: "—"}")
                ChoiceRow("Tipo de movimiento", listOf("Income", "Expense"), state.direction, !state.busy) { value -> update { s -> s.copy(direction = value) } }
                OutlinedTextField(state.amount, { value -> update { form -> form.copy(amount = value) } }, label = { Text("Importe exacto") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), enabled = !state.busy)
                OutlinedTextField(state.description, { value -> update { form -> form.copy(description = value) } }, label = { Text("Descripción (opcional)") }, modifier = Modifier.fillMaxWidth(), enabled = !state.busy)
                Button(onClick = submitMovement, enabled = !state.busy) { Text("Registrar movimiento") }
            }
        }
        if (state.busy) Text(if (state.reversalFormOpen) "Revirtiendo…" else "Guardando…")
        state.message?.let { Text(it) }
        if (state.messageKind == LedgerMessageKind.UnknownOutcome) {
            OutlinedButton(onClick = refresh, enabled = !state.busy) { Text("Actualizar y revisar") }
            Button(onClick = acknowledge, enabled = !state.busy) { Text("Ya revisé; habilitar otro registro") }
        }
        if (state.messageKind == LedgerMessageKind.RefreshFailure) OutlinedButton(onClick = refresh) { Text("Reintentar solo la actualización") }
        if (state.reversalFormOpen) {
            val selected = transactions.firstOrNull { it.id == state.selectedTransactionId }
            if (selected != null) AlertDialog(
                onDismissRequest = { if (!state.busy) update { it.copy(reversalFormOpen = false, selectedTransactionId = null) } },
                title = { Text("Confirmar reversión") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        val accountName = accounts.firstOrNull { it.id == selected.accountId }?.name ?: "Cuenta"
                        Text("$accountName · ${selected.direction} · ${selected.amount.displayAmount} ${selected.amount.currency} · ${selected.occurredAt}")
                        selected.description?.let { Text(it) }
                        Text("El movimiento original se conservará y se creará un movimiento compensatorio en la cuenta original.")
                        OutlinedTextField(state.reversalReason, { value -> update { it.copy(reversalReason = value) } }, label = { Text("Motivo (opcional)") }, enabled = !state.busy)
                    }
                },
                confirmButton = { Button(onClick = submitReversal, enabled = !state.busy) { Text("Confirmar reversión") } },
                dismissButton = { OutlinedButton(onClick = { update { it.copy(reversalFormOpen = false, selectedTransactionId = null) } }, enabled = !state.busy) { Text("Cancelar") } }
            )
        }
    }
}

@Composable private fun ChoiceRow(label: String, values: List<String>, selected: String, enabled: Boolean, choose: (String) -> Unit) {
    Column {
        Text(label)
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            values.forEach { value -> OutlinedButton(onClick = { choose(value) }, enabled = enabled) { Text(if (value == selected) "✓ $value" else value) } }
        }
    }
}

