package com.billefy.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.billefy.shared.model.AccountDto

// OpenPencil Design Colors
val DarkNavyBg = Color(0xFF0B132B)
val DarkNavyCard = Color(0xFF101B3B)
val VibrantBlue = Color(0xFF2563EB)
val LightBlueBg = Color(0xFFEFF6FF)
val EmeraldSuccess = Color(0xFF10B981)
val LightEmeraldBg = Color(0xFFECFDF5)
val PurpleAccent = Color(0xFF4F46E5)
val LightPurpleBg = Color(0xFFEEF2FF)
val AmberWarning = Color(0xFFF59E0B)
val SlateGrayText = Color(0xFF64748B)
val SlateSubtleBg = Color(0xFFF8FAFC)

@Composable
fun TopStatusBar(p2pRate: String = "9.85") {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(30.dp))
            .background(Color(0xFF0F172A))
            .padding(horizontal = 20.dp, vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "9:41",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "P2P: 1 USDT = Bs $p2pRate",
                    color = Color(0xFF60A5FA),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp
                )
                Spacer(modifier = Modifier.width(6.dp))
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(EmeraldSuccess)
                )
            }
        }
    }
}

@Composable
fun UserProfileHeader(
    userName: String = "Franco Dev",
    onScanQrClick: () -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .background(DarkNavyBg),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "FD",
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 16.sp
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = userName,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = Color(0xFF0F172A)
                )
                Text(
                    text = "Billefy Pro · Multimoneda",
                    fontSize = 12.sp,
                    color = SlateGrayText
                )
            }
        }

        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                .clickable { onScanQrClick() },
            contentAlignment = Alignment.Center
        ) {
            Text(text = "▦", fontSize = 18.sp, color = Color(0xFF0F172A))
        }
    }
}

@Composable
fun DarkHeroBalanceCard(
    totalBob: String = "86,450.00",
    equivalentUsd: String = "8,776.65",
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = DarkNavyBg)
    ) {
        Column(modifier = Modifier.padding(22.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Patrimonio Total",
                    color = Color(0xFF94A3B8),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(Color(0xFF1E293B))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "BOB (Bs.) ▼",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = "Bs. $totalBob",
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                fontFamily = FontFamily.Monospace
            )

            Text(
                text = "≈ $$equivalentUsd USD (al cambio P2P)",
                color = Color(0xFF94A3B8),
                fontSize = 13.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(18.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "+5.4% este mes",
                    color = EmeraldSuccess,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = "Bancos Bs 25.2k · Cripto 4.2k USDT",
                    color = Color(0xFF64748B),
                    fontSize = 11.sp
                )
            }
        }
    }
}

@Composable
fun QuickActionsRow(
    onTransferClick: () -> Unit = {},
    onCollectLoanClick: () -> Unit = {},
    onNewMovementClick: () -> Unit = {},
    onDraftsClick: () -> Unit = {},
    draftsCount: Int = 3
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // 1. Transferir
        QuickActionButton(
            label = "Transferir",
            icon = "↗",
            containerColor = LightBlueBg,
            contentColor = VibrantBlue,
            modifier = Modifier.weight(1f),
            onClick = onTransferClick
        )

        // 2. Cobrar
        QuickActionButton(
            label = "Cobrar",
            icon = "↙",
            containerColor = LightEmeraldBg,
            contentColor = EmeraldSuccess,
            modifier = Modifier.weight(1f),
            onClick = onCollectLoanClick
        )

        // 3. + Nuevo (Primary solid)
        QuickActionButton(
            label = "Nuevo",
            icon = "+",
            containerColor = VibrantBlue,
            contentColor = Color.White,
            modifier = Modifier.weight(1f),
            onClick = onNewMovementClick
        )

        // 4. Borradores
        QuickActionButton(
            label = "Borradores ($draftsCount)",
            icon = "✨",
            containerColor = LightPurpleBg,
            contentColor = PurpleAccent,
            modifier = Modifier.weight(1.2f),
            onClick = onDraftsClick
        )
    }
}

@Composable
fun QuickActionButton(
    label: String,
    icon: String,
    containerColor: Color,
    contentColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .background(containerColor)
            .clickable { onClick() }
            .padding(vertical = 12.dp, horizontal = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = icon,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = contentColor
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = contentColor,
                maxLines = 1
            )
        }
    }
}

@Composable
fun ConnectedAccountsHorizontalRow(
    accounts: List<AccountDto>,
    onLinkAccountClick: () -> Unit = {}
) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Mis Cuentas",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A)
            )

            Text(
                text = "Vincular",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = VibrantBlue,
                modifier = Modifier.clickable { onLinkAccountClick() }
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(accounts) { acc ->
                AccountChipCard(acc)
            }
        }
    }
}

@Composable
fun AccountChipCard(account: AccountDto) {
    val indicatorColor = when {
        account.type == "Exchange" || account.currency == "USDT" -> EmeraldSuccess
        account.type == "Cash" -> AmberWarning
        else -> VibrantBlue
    }

    Box(
        modifier = Modifier
            .width(136.dp)
            .clip(RoundedCornerShape(18.dp))
            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(18.dp))
            .background(Color.White)
            .padding(14.dp)
    ) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(indicatorColor)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = account.type,
                    fontSize = 11.sp,
                    color = SlateGrayText,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = account.name,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A),
                maxLines = 1
            )

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = "${if (account.currency == "BOB") "Bs " else ""}${account.balance.amount}${if (account.currency != "BOB") " ${account.currency}" else ""}",
                fontSize = 13.sp,
                fontWeight = FontWeight.ExtraBold,
                fontFamily = FontFamily.Monospace,
                color = Color(0xFF0F172A)
            )
        }
    }
}

@Composable
fun RecentActivityMobileSection() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(22.dp))
            .background(Color.White)
            .padding(16.dp)
    ) {
        Text(
            text = "Actividad Reciente",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF0F172A),
            modifier = Modifier.padding(bottom = 12.dp)
        )

        // Item 1: Hipermaxi Calacoto
        ActivityRowItem(
            title = "Hipermaxi Calacoto",
            subtitle = "BCP · Hoy 14:20",
            amount = "-Bs 420.00",
            amountColor = Color(0xFF0F172A)
        )

        // Item 2: Honorarios Desarrollo USD
        ActivityRowItem(
            title = "Honorarios Desarrollo USD",
            subtitle = "Binance P2P · Ayer",
            amount = "+1,200.00 USDT",
            amountColor = EmeraldSuccess
        )

        // Item 3: Cobro Préstamo Juan
        ActivityRowItem(
            title = "Cobro Préstamo Juan",
            subtitle = "Efectivo Bs · 10 May",
            amount = "+Bs 350.00",
            amountColor = EmeraldSuccess
        )
    }
}

@Composable
fun ActivityRowItem(
    title: String,
    subtitle: String,
    amount: String,
    amountColor: Color
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = title,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A)
            )
            Text(
                text = subtitle,
                fontSize = 11.sp,
                color = SlateGrayText
            )
        }

        Text(
            text = amount,
            fontSize = 13.sp,
            fontWeight = FontWeight.ExtraBold,
            fontFamily = FontFamily.Monospace,
            color = amountColor
        )
    }
}
