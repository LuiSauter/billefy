package com.billefy.app

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.window.Dialog
import com.billefy.app.state.AuthState
import com.billefy.app.state.WalletSessionController
import com.billefy.app.ui.AuthStatusScreen
import com.billefy.app.ui.ConnectedWalletScreen
import com.billefy.app.ui.ProminentDisclosureDialog

@Composable
fun App(
    controller: WalletSessionController?,
    configError: String?,
    onLogin: () -> Unit,
    onRequestNotificationPermission: () -> Unit
) {
    MaterialTheme {
        Surface {
            var showDisclosure by remember { mutableStateOf(false) }
            val state by controller?.state?.collectAsState() ?: androidx.compose.runtime.remember {
                androidx.compose.runtime.mutableStateOf(com.billefy.app.state.WalletUiState())
            }
            if (state.auth is AuthState.Authenticated) {
                ConnectedWalletScreen(
                    state,
                    onRetry = { controller?.retryWallet() },
                    onLogout = { controller?.logout() },
                    onDisclosure = { showDisclosure = true },
                    onOpenAccount = { controller?.openAccountForm() },
                    onOpenMovement = { controller?.openMovementForm() },
                    onOpenReversal = { controller?.openReversalForm(it) },
                    onUpdateLedger = { controller?.updateLedger(it) },
                    onSubmitAccount = { controller?.submitAccount() },
                    onSubmitMovement = { controller?.submitMovement() },
                    onSubmitReversal = { controller?.submitReversal() },
                    onAcknowledge = { controller?.acknowledgeUnknownOutcome() }
                )
            } else {
                AuthStatusScreen(
                    state.auth, state.authError, configError, onLogin,
                    onRetry = { controller?.retryWallet() }, onLogout = { controller?.logout() }
                )
            }
            if (showDisclosure) Dialog(onDismissRequest = { showDisclosure = false }) {
                ProminentDisclosureDialog(onDismiss = { showDisclosure = false }, onAccept = {
                    showDisclosure = false
                    onRequestNotificationPermission()
                })
            }
        }
    }
}
