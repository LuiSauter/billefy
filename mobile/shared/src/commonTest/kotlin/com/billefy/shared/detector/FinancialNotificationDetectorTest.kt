package com.billefy.shared.detector

import com.billefy.shared.model.Money
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class FinancialNotificationDetectorTest {

    @Test
    fun testPositive_BolivianosTransferReceived() {
        val result = FinancialNotificationDetector.evaluate(
            packageName = "com.banco.union",
            title = "Banco Unión Móvil",
            text = "Transferencia recibida por Bs. 250.00 de Pedro. Ref: TX-112233"
        )

        assertTrue(result.isFinancial)
        assertNotNull(result.amount)
        assertEquals("250", result.amount.displayAmount)
        assertEquals("BOB", result.amount.currency)
        assertEquals(DetectedDirection.Income, result.direction)
        assertEquals("TX-112233", result.reference)
        assertTrue(result.confidence >= 0.90)
    }

    @Test
    fun testPositive_DebitCardPurchaseWithComma() {
        val result = FinancialNotificationDetector.evaluate(
            packageName = "com.bcp.bo",
            title = "Alerta BCP",
            text = "Pago con tarjeta de débito por 45,50 Bs en Farmacorp"
        )

        assertTrue(result.isFinancial)
        assertNotNull(result.amount)
        assertEquals("45.5", result.amount.displayAmount)
        assertEquals("BOB", result.amount.currency)
        assertEquals(DetectedDirection.Expense, result.direction)
    }

    @Test
    fun testPositive_DollarsReceived() {
        val result = FinancialNotificationDetector.evaluate(
            packageName = "com.binance.dev",
            title = "Binance",
            text = "You received a deposit of $150.00 from P2P order. Ref: BIN-9922"
        )

        assertTrue(result.isFinancial)
        assertNotNull(result.amount)
        assertEquals("150", result.amount.displayAmount)
        assertEquals("USD", result.amount.currency)
        assertEquals(DetectedDirection.Income, result.direction)
        assertEquals("BIN-9922", result.reference)
    }

    @Test
    fun testPositive_UsdtDeposit() {
        val result = FinancialNotificationDetector.evaluate(
            packageName = "com.binance.dev",
            title = "Binance Pay",
            text = "Depósito confirmado por 500 USDT en tu cuenta de fondos"
        )

        assertTrue(result.isFinancial)
        assertNotNull(result.amount)
        assertEquals("500", result.amount.displayAmount)
        assertEquals("USDT", result.amount.currency)
        assertEquals(DetectedDirection.Income, result.direction)
    }

    @Test
    fun testPositive_ATMWithdrawal() {
        val result = FinancialNotificationDetector.evaluate(
            packageName = "com.bnb.mobile",
            title = "Banco Nacional de Bolivia",
            text = "Retiro en cajero automático por 200 Bs de tu caja de ahorro"
        )

        assertTrue(result.isFinancial)
        assertNotNull(result.amount)
        assertEquals("200", result.amount.displayAmount)
        assertEquals("BOB", result.amount.currency)
        assertEquals(DetectedDirection.Expense, result.direction)
    }

    // ================= NEGATIVE CORPUS (Rule 14 & ING-03) =================

    @Test
    fun testNegative_PersonalChatMessage() {
        val result = FinancialNotificationDetector.evaluate(
            packageName = "com.whatsapp",
            title = "Mamá",
            text = "Hola hijo, ¿cómo estás? Te esperamos para cenar a las 8pm."
        )

        assertFalse(result.isFinancial, "Personal chats must never be classified as financial.")
        assertNull(result.amount)
    }

    @Test
    fun testNegative_TwoFactorAuthCode() {
        val result = FinancialNotificationDetector.evaluate(
            packageName = "com.google.android.apps.messaging",
            title = "Código de seguridad",
            text = "Tu código de verificación es 849201. Vence en 5 minutos. No lo compartas."
        )

        assertFalse(result.isFinancial, "2FA codes must never be classified as financial.")
        assertNull(result.amount)
    }

    @Test
    fun testNegative_CalendarReminder() {
        val result = FinancialNotificationDetector.evaluate(
            packageName = "com.google.android.calendar",
            title = "Recordatorio",
            text = "Cita médica el viernes a las 10:00"
        )

        assertFalse(result.isFinancial)
        assertNull(result.amount)
    }

    @Test
    fun testNegative_SocialMedia() {
        val result = FinancialNotificationDetector.evaluate(
            packageName = "com.instagram.android",
            title = "Instagram",
            text = "A Carlos y 5 personas más les gustó tu publicación."
        )

        assertFalse(result.isFinancial)
        assertNull(result.amount)
    }

    @Test
    fun testNegative_PromotionalSpamWithoutMoney() {
        val result = FinancialNotificationDetector.evaluate(
            packageName = "com.supermercado.app",
            title = "Ofertas del día",
            text = "¡Aprovecha hasta 50% de descuento en todos los vinos y quesos!"
        )

        assertFalse(result.isFinancial, "Discount percentages are not money movements.")
        assertNull(result.amount)
    }

    @Test
    fun testNegative_EmptyOrBlankNotification() {
        val result = FinancialNotificationDetector.evaluate(
            packageName = "com.unknown.app",
            title = "",
            text = "   "
        )

        assertFalse(result.isFinancial)
    }
}
