package com.billefy.app

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.billefy.app.ui.BudgetsMobileView
import com.billefy.app.ui.ConnectedAccountsHorizontalRow
import com.billefy.app.ui.DarkHeroBalanceCard
import com.billefy.app.ui.DraftsReviewDialog
import com.billefy.app.ui.LoanCollectionDialog
import com.billefy.app.ui.ProminentDisclosureDialog
import com.billefy.app.ui.QuickActionsRow
import com.billefy.app.ui.QuickMovementKeypadDialog
import com.billefy.app.ui.RecentActivityMobileSection
import com.billefy.app.ui.SlateGrayText
import com.billefy.app.ui.TopStatusBar
import com.billefy.app.ui.UserProfileHeader
import com.billefy.app.ui.VibrantBlue
import com.billefy.shared.model.AccountDto
import com.billefy.shared.model.Money

@Composable
fun App(
    accounts: List<AccountDto> = emptyList(),
    onRequestNotificationPermission: () -> Unit = {}
) {
    // Current Active Tab
    var currentTab by remember { mutableStateOf("Billetera") }

    // Dialogs / Sheets State
    var showNewMovementDialog by remember { mutableStateOf(false) }
    var showDraftsDialog by remember { mutableStateOf(false) }
    var showLoanDialog by remember { mutableStateOf(false) }
    var showDisclosure by remember { mutableStateOf(false) }

    // Provide default fallback accounts if list is empty for visual richness
    val displayAccounts = if (accounts.isNotEmpty()) {
        accounts
    } else {
        listOf(
            AccountDto(
                id = "acc-1",
                name = "Banco Unión",
                type = "Sueldo",
                currency = "BOB",
                balance = Money.of("18400.00", "BOB"),
                createdAt = "2025-01-01"
            ),
            AccountDto(
                id = "acc-2",
                name = "Banco BCP",
                type = "Billetera",
                currency = "BOB",
                balance = Money.of("6850.00", "BOB"),
                createdAt = "2025-01-01"
            ),
            AccountDto(
                id = "acc-3",
                name = "Binance Wallet",
                type = "Exchange",
                currency = "USDT",
                balance = Money.of("4250.00", "USDT"),
                createdAt = "2025-01-01"
            )
        )
    }

    MaterialTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = Color(0xFFF8FAFC)
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    // 1. Dynamic Island Top Bar with live P2P rate (OpenPencil 02)
                    TopStatusBar(p2pRate = "9.85")

                    // 2. User Profile Header with avatar & QR action
                    UserProfileHeader(
                        userName = "Franco Dev",
                        onScanQrClick = { showNewMovementDialog = true }
                    )

                    // Tab Selector Navigation (Billetera | Presupuestos | Captura)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color(0xFFF1F5F9))
                            .padding(4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        listOf("Billetera", "Presupuestos", "Captura").forEach { tab ->
                            val isSelected = currentTab == tab
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (isSelected) Color.White else Color.Transparent)
                                    .clickable { currentTab = tab }
                                    .padding(vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = tab,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color(0xFF0F172A) else SlateGrayText
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // DYNAMIC TAB CONTENT
                    when (currentTab) {
                        "Billetera" -> {
                            // 3. Dark Hero Balance Card
                            DarkHeroBalanceCard(
                                totalBob = "86,450.00",
                                equivalentUsd = "8,776.65"
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            // 4. Quick Actions 1-Tap Row (Transferir, Cobrar, + Nuevo, Borradores)
                            QuickActionsRow(
                                onTransferClick = { showNewMovementDialog = true },
                                onCollectLoanClick = { showLoanDialog = true },
                                onNewMovementClick = { showNewMovementDialog = true },
                                onDraftsClick = { showDraftsDialog = true },
                                draftsCount = 3
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            // 5. Mis Cuentas Horizontal Cards
                            ConnectedAccountsHorizontalRow(
                                accounts = displayAccounts,
                                onLinkAccountClick = { showNewMovementDialog = true }
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            // 6. Actividad Reciente & Auditoría de Tasas P2P
                            RecentActivityMobileSection()

                            Spacer(modifier = Modifier.height(20.dp))
                        }

                        "Presupuestos" -> {
                            BudgetsMobileView(
                                onNewBudgetClick = { showNewMovementDialog = true }
                            )
                        }

                        "Captura" -> {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp)
                            ) {
                                Text(
                                    text = "Smart Capture & Privacidad",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF0F172A)
                                )
                                Spacer(modifier = Modifier.height(8.dp))

                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(20.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                                ) {
                                    Column(modifier = Modifier.padding(18.dp)) {
                                        Text(
                                            text = "⚡ Detección On-Device de Notificaciones",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = VibrantBlue
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "Billefy filtra notificaciones bancarias de bancos bolivianos en tu teléfono sin enviar datos privados.",
                                            fontSize = 12.sp,
                                            color = SlateGrayText
                                        )
                                        Spacer(modifier = Modifier.height(14.dp))
                                        Button(
                                            onClick = { showDisclosure = true },
                                            colors = ButtonDefaults.buttonColors(containerColor = VibrantBlue),
                                            shape = RoundedCornerShape(14.dp),
                                            modifier = Modifier.fillMaxWidth().height(46.dp)
                                        ) {
                                            Text("Ver Divulgación y Activar Permiso", fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // DIALOGS & OVERLAYS
                if (showNewMovementDialog) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.5f))
                            .clickable { showNewMovementDialog = false },
                        contentAlignment = Alignment.Center
                    ) {
                        QuickMovementKeypadDialog(
                            onDismiss = { showNewMovementDialog = false },
                            onConfirm = { _, _, _ -> showNewMovementDialog = false }
                        )
                    }
                }

                if (showDraftsDialog) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.5f))
                            .clickable { showDraftsDialog = false },
                        contentAlignment = Alignment.Center
                    ) {
                        DraftsReviewDialog(
                            onDismiss = { showDraftsDialog = false },
                            onApproveAll = { showDraftsDialog = false },
                            onApproveItem = { _ -> showDraftsDialog = false }
                        )
                    }
                }

                if (showLoanDialog) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.5f))
                            .clickable { showLoanDialog = false },
                        contentAlignment = Alignment.Center
                    ) {
                        LoanCollectionDialog(
                            onDismiss = { showLoanDialog = false },
                            onCollect = { showLoanDialog = false }
                        )
                    }
                }

                if (showDisclosure) {
                    ProminentDisclosureDialog(
                        onAccept = {
                            showDisclosure = false
                            onRequestNotificationPermission()
                        },
                        onDismiss = { showDisclosure = false }
                    )
                }
            }
        }
    }
}
