package com.billefy.app

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
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.billefy.shared.model.AccountDto
import com.billefy.shared.model.Money

@Composable
fun App() {
    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Billefy",
                    style = MaterialTheme.typography.headlineMedium
                )
                Text(
                    text = "Gestor Multimoneda · Ledger Inmutable",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(16.dp))

                val sampleAccounts = remember {
                    listOf(
                        AccountDto("1", "Banco Unión", "Bank", "BOB", Money.of("4500.0", "BOB"), "2026-10-26"),
                        AccountDto("2", "Efectivo", "Cash", "BOB", Money.of("350.0", "BOB"), "2026-10-26"),
                        AccountDto("3", "Billetera USD", "Wallet", "USD", Money.of("820.0", "USD"), "2026-10-26")
                    )
                }

                Text(
                    text = "Tus Cuentas",
                    style = MaterialTheme.typography.titleMedium
                )
                Spacer(modifier = Modifier.height(8.dp))

                LazyColumn {
                    items(sampleAccounts) { acc ->
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text(acc.name, style = MaterialTheme.typography.titleSmall)
                                    Text("${acc.type} · ${acc.currency}", style = MaterialTheme.typography.bodySmall)
                                }
                                Text(
                                    "${acc.balance.displayAmount} ${acc.currency}",
                                    style = MaterialTheme.typography.titleSmall
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
