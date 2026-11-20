package com.billefy.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.billefy.app.state.WalletAppState

@Composable
fun MobileDialogsHost(
    state: WalletAppState,
    onRequestNotificationPermission: () -> Unit = {}
) {
    if (state.showNewMovementDialog) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.5f))
                .clickable { state.showNewMovementDialog = false },
            contentAlignment = Alignment.Center
        ) {
            QuickMovementKeypadDialog(
                onDismiss = { state.showNewMovementDialog = false },
                onConfirm = { _, _, _ -> state.showNewMovementDialog = false }
            )
        }
    }

    if (state.showDraftsDialog) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.5f))
                .clickable { state.showDraftsDialog = false },
            contentAlignment = Alignment.Center
        ) {
            DraftsReviewDialog(
                onDismiss = { state.showDraftsDialog = false },
                onApproveAll = { state.showDraftsDialog = false },
                onApproveItem = { _ -> state.showDraftsDialog = false }
            )
        }
    }

    if (state.showLoanDialog) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.5f))
                .clickable { state.showLoanDialog = false },
            contentAlignment = Alignment.Center
        ) {
            LoanCollectionDialog(
                onDismiss = { state.showLoanDialog = false },
                onCollect = { state.showLoanDialog = false }
            )
        }
    }

    if (state.showContributeDialog) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.5f))
                .clickable { state.showContributeDialog = false },
            contentAlignment = Alignment.Center
        ) {
            ContributeGoalDialog(
                goalName = state.selectedGoalName,
                onDismiss = { state.showContributeDialog = false },
                onConfirm = { _ -> state.showContributeDialog = false }
            )
        }
    }

    if (state.showDisclosure) {
        ProminentDisclosureDialog(
            onAccept = {
                state.showDisclosure = false
                onRequestNotificationPermission()
            },
            onDismiss = { state.showDisclosure = false }
        )
    }
}
