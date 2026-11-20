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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// =============================================================================
// 1. OpenPencil Mobile 03: Movimiento 1-Tap Keypad Sheet
// =============================================================================
@Composable
fun QuickMovementKeypadDialog(
    onDismiss: () -> Unit,
    onConfirm: (amount: String, type: String, account: String) -> Unit
) {
    var amountText by remember { mutableStateOf("185.00") }
    var selectedType by remember { mutableStateOf("Gasto") }
    var selectedAccount by remember { mutableStateOf("Banco Unión") }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Nuevo Movimiento",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = Color(0xFF0F172A)
                )

                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFF1F5F9))
                        .clickable { onDismiss() },
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "✕", fontSize = 12.sp, color = SlateGrayText)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Segmented Control: Gasto | Ingreso | Transferir
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color(0xFFF1F5F9))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                listOf("Gasto", "Ingreso", "Transferir").forEach { tab ->
                    val isSelected = selectedType == tab
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (isSelected) Color.White else Color.Transparent)
                            .clickable { selectedType = tab }
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

            Spacer(modifier = Modifier.height(16.dp))

            // Amount Display
            Text(
                text = "Bs. $amountText",
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                fontFamily = FontFamily.Monospace,
                color = Color(0xFF0F172A)
            )

            Text(
                text = "≈ $18.78 USD (Tasa P2P Bs 9.85)",
                fontSize = 12.sp,
                color = VibrantBlue,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Account selection chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                listOf(
                    "Banco Unión" to "Bs 18.4k",
                    "BCP" to "Bs 6.8k",
                    "Efectivo" to "Bs 1.2k"
                ).forEach { (acc, bal) ->
                    val isSelected = selectedAccount == acc
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .border(
                                1.dp,
                                if (isSelected) VibrantBlue else Color(0xFFE2E8F0),
                                RoundedCornerShape(12.dp)
                            )
                            .background(if (isSelected) LightBlueBg else Color.White)
                            .clickable { selectedAccount = acc }
                            .padding(vertical = 8.dp, horizontal = 4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "$acc ($bal)",
                            fontSize = 10.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) VibrantBlue else Color(0xFF0F172A),
                            maxLines = 1
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 1-Tap Keypad Grid
            val keys = listOf(
                listOf("1", "2", "3"),
                listOf("4", "5", "6"),
                listOf("7", "8", "9"),
                listOf(".", "0", "⌫")
            )

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                keys.forEach { row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        row.forEach { k ->
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(44.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFFF8FAFC))
                                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                                    .clickable {
                                        when (k) {
                                            "⌫" -> if (amountText.isNotEmpty()) amountText = amountText.dropLast(1)
                                            "." -> if (!amountText.contains(".")) amountText += "."
                                            else -> {
                                                if (amountText == "0" || amountText == "185.00") amountText = k
                                                else amountText += k
                                            }
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = k,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF0F172A)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Action: Confirm Movement
            Button(
                onClick = {
                    onConfirm(amountText, selectedType, selectedAccount)
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = VibrantBlue)
            ) {
                Text(
                    text = "✓ Confirmar Movimiento",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color.White
                )
            }
        }
    }
}

// =============================================================================
// 2. OpenPencil Mobile 04: Bandeja de Borradores Sheet
// =============================================================================
@Composable
fun DraftsReviewDialog(
    onDismiss: () -> Unit,
    onApproveAll: () -> Unit,
    onApproveItem: (String) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Borradores Detectados (3)",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = Color(0xFF0F172A)
                )

                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFF1F5F9))
                        .clickable { onDismiss() },
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "✕", fontSize = 12.sp, color = SlateGrayText)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Button: Aprobar los 3 (Indigo)
            Button(
                onClick = {
                    onApproveAll()
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth().height(46.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PurpleAccent)
            ) {
                Text(
                    text = "✓ Aprobar los 3",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color.White
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Draft Items
            val drafts = listOf(
                Triple("Hipermaxi Calacoto", "Banco BCP · Comida", "-Bs 240.00"),
                Triple("Transferencia Recibida", "Banco Unión · Ingreso", "+Bs 3,200.00"),
                Triple("Taxi Aeropuerto El Alto", "WhatsApp Bot · Transporte", "-Bs 70.00")
            )

            drafts.forEach { (merchant, subtitle, amount) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .border(1.dp, Color(0xFFF1F5F9), RoundedCornerShape(16.dp))
                        .background(Color(0xFFF8FAFC))
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = merchant,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color(0xFF0F172A)
                        )
                        Text(
                            text = subtitle,
                            fontSize = 11.sp,
                            color = SlateGrayText
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = amount,
                            fontWeight = FontWeight.ExtraBold,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 13.sp,
                            color = if (amount.startsWith("+")) EmeraldSuccess else Color(0xFF0F172A)
                        )

                        Spacer(modifier = Modifier.width(10.dp))

                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(EmeraldSuccess)
                                .clickable { onApproveItem(merchant) },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = "✓", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                    }
                }
            }
        }
    }
}

// =============================================================================
// 3. OpenPencil Mobile 05: Ficha de Préstamo & Cobro 1-Tap
// =============================================================================
@Composable
fun LoanCollectionDialog(
    onDismiss: () -> Unit,
    onCollect: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Ficha de Préstamo",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = Color(0xFF0F172A)
                )

                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFF1F5F9))
                        .clickable { onDismiss() },
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "✕", fontSize = 12.sp, color = SlateGrayText)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Borrower Info Card
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .border(1.dp, Color(0xFFF1F5F9), RoundedCornerShape(16.dp))
                    .background(Color(0xFFF8FAFC))
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Juan Pérez",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Color(0xFF0F172A)
                    )
                    Text(
                        text = "Total: Bs 1,050.00 · 3 cuotas",
                        fontSize = 12.sp,
                        color = SlateGrayText
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(LightEmeraldBg)
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "Por Cobrar",
                        color = EmeraldSuccess,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Active Installment Box (Blue)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .border(1.dp, Color(0xFFBFDBFE), RoundedCornerShape(18.dp))
                    .background(LightBlueBg)
                    .padding(16.dp)
            ) {
                Text(
                    text = "Cuota 1 de 3 · Vence 15 Mayo",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = VibrantBlue
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Bs. 385.00",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.ExtraBold,
                    fontFamily = FontFamily.Monospace,
                    color = Color(0xFF0F172A)
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Capital: Bs 350.00 · Interés: Bs 35.00 (10%)",
                    fontSize = 11.sp,
                    color = SlateGrayText
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Action: Cobrar 1-Tap (Emerald)
            Button(
                onClick = {
                    onCollect()
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldSuccess)
            ) {
                Text(
                    text = "💸 Cobrar Bs 385.00 (1-Tap)",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color.White
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Installment schedule
            listOf(
                "Cuota 1 · 15 May" to "Bs 385.00",
                "Cuota 2 · 15 Jun" to "Bs 385.00",
                "Cuota 3 · 15 Jul" to "Bs 385.00"
            ).forEach { (installment, amount) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(1.dp, Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                        .background(Color.White)
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = installment, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF0F172A))
                    Text(text = amount, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                }
            }
        }
    }
}

// =============================================================================
// 4. OpenPencil Mobile 06: Presupuestos de Mayo
// =============================================================================
@Composable
fun BudgetsMobileView(
    onNewBudgetClick: () -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        // Title Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Presupuestos de Mayo",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A)
            )

            Text(
                text = "+ Nuevo",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = VibrantBlue,
                modifier = Modifier.clickable { onNewBudgetClick() }
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Dark Summary Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = DarkNavyBg)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "Presupuesto Total Gastado", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    Text(text = "78% Consumido", color = Color(0xFF60A5FA), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = "Bs. 14,200 / Bs. 18,000",
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    fontFamily = FontFamily.Monospace
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Progress Bar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(Color(0xFF1E293B))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.78f)
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(VibrantBlue)
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "Ritmo seguro: Bs 200/día", color = EmeraldSuccess, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text(text = "19 días restantes", color = Color(0xFF64748B), fontSize = 11.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        Text(
            text = "Límites por Categoría (Bs)",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF0F172A)
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Categories list
        val categories = listOf(
            Triple("🍔 Alimentos & Supermercado", "Bs 3,200 / Bs 4,000", 0.80f to VibrantBlue),
            Triple("🚗 Transporte & Gasolina", "Bs 1,800 / Bs 2,000", 0.90f to AmberWarning),
            Triple("🏠 Vivienda & Servicios", "Bs 5,000 / Bs 5,000", 1.0f to Color(0xFFEF4444))
        )

        categories.forEach { (cat, amount, prog) ->
            val (ratio, color) = prog
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
                    .background(Color.White)
                    .padding(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = cat, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                    Text(
                        text = if (ratio >= 1.0f) "Tope Máximo" else if (ratio >= 0.8f) "Alerta 80% ⚠" else "Normal",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = color
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))
                Text(text = amount, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, fontFamily = FontFamily.Monospace, color = Color(0xFF0F172A))

                Spacer(modifier = Modifier.height(8.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(5.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(Color(0xFFF1F5F9))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(ratio)
                            .height(5.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(color)
                    )
                }
            }
        }
    }
}
