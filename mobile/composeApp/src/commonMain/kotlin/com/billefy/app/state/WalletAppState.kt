package com.billefy.app.state

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue

class WalletAppState {
    var isAuthenticated by mutableStateOf(true)
    var currentTab by mutableStateOf("Billetera")
    var showNewMovementDialog by mutableStateOf(false)
    var showDraftsDialog by mutableStateOf(false)
    var showLoanDialog by mutableStateOf(false)
    var showContributeDialog by mutableStateOf(false)
    var selectedGoalName by mutableStateOf("🛡️ Fondo de Emergencia")
    var showDisclosure by mutableStateOf(false)
}

@Composable
fun rememberWalletAppState(): WalletAppState = remember { WalletAppState() }
