package com.billefy.app.ui

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
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
// 1. OpenPencil Mobile 01: Inicio de Sesión Móvil
// =============================================================================
@Composable
fun MobileAuthScreen(
    onLoginSuccess: () -> Unit
) {
    var email by remember { mutableStateOf("franco@billefy.app") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // App Icon
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(DarkNavyBg),
            contentAlignment = Alignment.Center
        ) {
            Text(text = "💼", fontSize = 28.sp)
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Billefy",
            fontSize = 32.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Color(0xFF0F172A)
        )

        Text(
            text = "Tu billetera multimoneda inteligente",
            fontSize = 14.sp,
            color = SlateGrayText,
            fontWeight = FontWeight.Medium
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Button: Google
        Button(
            onClick = { onLoginSuccess() },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(18.dp)),
            shape = RoundedCornerShape(18.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color.White)
        ) {
            Text(
                text = "🌐 Continuar con Google",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Button: Apple
        Button(
            onClick = { onLoginSuccess() },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(18.dp),
            colors = ButtonDefaults.buttonColors(containerColor = DarkNavyBg)
        ) {
            Text(
                text = " Continuar con Apple",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(modifier = Modifier.weight(1f).height(1.dp).background(Color(0xFFE2E8F0)))
            Text(
                text = "  o con correo  ",
                fontSize = 12.sp,
                color = SlateGrayText,
                fontWeight = FontWeight.Medium
            )
            Box(modifier = Modifier.weight(1f).height(1.dp).background(Color(0xFFE2E8F0)))
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Email field
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
                .background(Color(0xFFF8FAFC))
                .padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
            Text(text = email, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Currency Preference (Green)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .border(1.dp, Color(0xFFA7F3D0), RoundedCornerShape(16.dp))
                .background(LightEmeraldBg)
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(text = "Moneda de vista principal:", fontSize = 11.sp, color = Color(0xFF065F46))
                Text(text = "Boliviano (BOB • Bs.) ▼", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF065F46))
            }
            Text(text = "Tasa P2P Activa ✓", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = EmeraldSuccess)
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Submit Button
        Button(
            onClick = { onLoginSuccess() },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(18.dp),
            colors = ButtonDefaults.buttonColors(containerColor = VibrantBlue)
        ) {
            Text(
                text = "Ingresar a mi Billetera",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }
    }
}

// =============================================================================
// 2. OpenPencil Mobile 07: Objetivos Financieros (Metas)
// =============================================================================
@Composable
fun FinancialGoalsMobileView(
    onNewGoalClick: () -> Unit = {},
    onContributeClick: (String) -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Objetivos Financieros",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A)
            )

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(LightBlueBg)
                    .clickable { onNewGoalClick() }
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "+ Nueva Meta",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = VibrantBlue
                )
            }
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
                    Text(text = "Salud Financiera Billefy", color = Color(0xFF94A3B8), fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFF064E3B))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Text(text = "Estado Óptimo ✓", color = EmeraldSuccess, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Tasa Ahorro
                    Column {
                        Text(text = "Tasa Ahorro", fontSize = 10.sp, color = Color(0xFF94A3B8))
                        Text(text = "24%", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text(text = "Meta: >20%", fontSize = 9.sp, color = EmeraldSuccess, fontWeight = FontWeight.Bold)
                    }

                    // Fondo Emergencia
                    Column {
                        Text(text = "Fondo Emergencia", fontSize = 10.sp, color = Color(0xFF94A3B8))
                        Text(text = "4.2 meses", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color(0xFF60A5FA))
                        Text(text = "Bs. 21,500 cubiertos", fontSize = 9.sp, color = Color(0xFF94A3B8))
                    }

                    // Carga Deuda
                    Column {
                        Text(text = "Carga Deuda", fontSize = 10.sp, color = Color(0xFF94A3B8))
                        Text(text = "12%", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color(0xFF34D399))
                        Text(text = "Límite máx 30%", fontSize = 9.sp, color = Color(0xFF94A3B8))
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Goals List (OpenPencil 07)
        val goals = listOf(
            Triple("🛡️ Fondo de Emergencia", "Banco Unión · Ahorro", "Bs. 21,500 / Bs. 30,000" to (0.71f to VibrantBlue)),
            Triple("🚗 Entrada Vehículo", "Binance Wallet · USDT", "3,250 / 5,000 USDT" to (0.65f to EmeraldSuccess)),
            Triple("🏖️ Vacaciones Fin de Año", "Banco BCP · Gastos futuros", "Bs. 4,800 / Bs. 8,000" to (0.60f to PurpleAccent))
        )

        goals.forEach { (name, account, data) ->
            val (amount, prog) = data
            val (ratio, color) = prog

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(18.dp))
                    .background(Color.White)
                    .padding(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(text = name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                        Text(text = account, fontSize = 11.sp, color = SlateGrayText)
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(LightBlueBg)
                            .clickable { onContributeClick(name) }
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                    ) {
                        Text(text = "+ Aportar", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = VibrantBlue)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = amount, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, fontFamily = FontFamily.Monospace, color = Color(0xFF0F172A))
                    Text(text = "${(ratio * 100).toInt()}%", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = color)
                }

                Spacer(modifier = Modifier.height(6.dp))

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

                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Aporte sugerido: Bs. 850/mes",
                    fontSize = 11.sp,
                    color = SlateGrayText
                )
            }
        }
    }
}

// =============================================================================
// 3. OpenPencil Mobile 09: Modal Aporte Rápido a Meta
// =============================================================================
@Composable
fun ContributeGoalDialog(
    goalName: String = "🛡️ Fondo de Emergencia",
    onDismiss: () -> Unit,
    onConfirm: (Double) -> Unit
) {
    var selectedAmount by remember { mutableStateOf(850.0) }

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
                    text = "Aportar a Objetivo",
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

            // Box 1: Meta Destino (Green)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .border(1.dp, Color(0xFFA7F3D0), RoundedCornerShape(16.dp))
                    .background(LightEmeraldBg)
                    .padding(14.dp)
            ) {
                Text(text = "Meta Destino: $goalName", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF065F46))
                Text(text = "Progreso actual: Bs. 21,500 de Bs. 30,000 (71%)", fontSize = 11.sp, color = Color(0xFF047857))
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Box 2: Desde Banco Unión
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
                    .background(Color(0xFFF8FAFC))
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = "Desde: Banco Unión (Sueldo)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                Text(text = "Saldo: Bs 18,400", fontSize = 12.sp, color = SlateGrayText)
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Box 3: Monto a Destinar
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(18.dp))
                    .background(Color.White)
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(text = "Monto a Destinar", fontSize = 11.sp, color = SlateGrayText, fontWeight = FontWeight.Medium)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Bs. ${selectedAmount.toInt()}.00",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.ExtraBold,
                    fontFamily = FontFamily.Monospace,
                    color = Color(0xFF0F172A)
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Quick chips
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf(
                        "+Bs 200" to 200.0,
                        "+Bs 500" to 500.0,
                        "Sugerido (Bs 850)" to 850.0,
                        "Máx" to 1500.0
                    ).forEach { (label, amt) ->
                        val isSelected = selectedAmount == amt
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (isSelected) VibrantBlue else Color(0xFFF1F5F9))
                                .clickable { selectedAmount = amt }
                                .padding(vertical = 7.dp, horizontal = 2.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = label,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) Color.White else Color(0xFF0F172A),
                                maxLines = 1
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Projection Box
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(LightBlueBg)
                    .padding(10.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = "Nuevo progreso: 74% (+3%)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = VibrantBlue)
                Text(text = "Faltarán Bs 7,650", fontSize = 11.sp, color = VibrantBlue)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Confirm 1-Tap
            Button(
                onClick = {
                    onConfirm(selectedAmount)
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldSuccess)
            ) {
                Text(
                    text = "Confirmar Aporte (1-Tap)",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color.White
                )
            }
        }
    }
}

// =============================================================================
// 4. OpenPencil Mobile 11: Pagos & Ingresos Fijos
// =============================================================================
@Composable
fun RecurringPaymentsMobileView(
    onPay1Click: (String, String) -> Unit = { _, _ -> },
    onRescheduleClick: (String) -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        // Title
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Pagos & Ingresos Fijos",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A)
            )

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(LightBlueBg)
                    .clickable { }
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "+ Programar",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = VibrantBlue
                )
            }
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
                    Text(text = "Flujo Recurrente Mensual", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    Text(text = "+Bs. 13,820 Libre", color = EmeraldSuccess, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(text = "Ingresos Fijos", fontSize = 10.sp, color = Color(0xFF94A3B8))
                        Text(text = "+Bs. 18,500.00", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = EmeraldSuccess)
                    }

                    Column {
                        Text(text = "Pagos Fijos (3)", fontSize = 10.sp, color = Color(0xFF94A3B8))
                        Text(text = "-Bs. 4,680.00", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF87171))
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Próximos Pagos a Vencer",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF0F172A)
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Payments List
        val upcoming = listOf(
            Triple("Internet Fibra Tigo", "Vence en 2 días (15 May) · Banco Unión", "Bs. 280.00" to AmberWarning),
            Triple("Alquiler Departamento", "Vence 20 May (en 7 días) · Banco Unión", "Bs. 3,200.00" to VibrantBlue),
            Triple("Suscripción iCloud + Spotify", "Vence 25 May · Binance Card", "14.99 USDT" to VibrantBlue)
        )

        upcoming.forEach { (name, desc, data) ->
            val (amount, badgeColor) = data
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(18.dp))
                    .background(Color.White)
                    .padding(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = name, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                    Text(text = amount, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, fontFamily = FontFamily.Monospace, color = Color(0xFF0F172A))
                }

                Spacer(modifier = Modifier.height(2.dp))
                Text(text = desc, fontSize = 11.sp, color = SlateGrayText)

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    Text(
                        text = "📅 Modificar",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = VibrantBlue,
                        modifier = Modifier
                            .clickable { onRescheduleClick(name) }
                            .padding(horizontal = 8.dp, vertical = 6.dp)
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(EmeraldSuccess)
                            .clickable { onPay1Click(name, amount) }
                            .padding(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Text(text = "Pagar 1-Tap", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Ingresos Fijos Configurados",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF0F172A)
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Fixed Income 1
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .border(1.dp, Color(0xFFA7F3D0), RoundedCornerShape(16.dp))
                .background(LightEmeraldBg)
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(text = "💼 Sueldo Mensual Fijo", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF065F46))
                Text(text = "Día 30 de cada mes · Banco Unión", fontSize = 11.sp, color = Color(0xFF047857))
            }
            Text(text = "+Bs. 12,000.00", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = EmeraldSuccess)
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Fixed Income 2
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .border(1.dp, Color(0xFFA7F3D0), RoundedCornerShape(16.dp))
                .background(LightEmeraldBg)
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(text = "💻 Consultoría Remota USD", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF065F46))
                Text(text = "Quincenal (días 15 y 30) · Binance P2P", fontSize = 11.sp, color = Color(0xFF047857))
            }
            Text(text = "+650.00 USDT", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = EmeraldSuccess)
        }
    }
}
