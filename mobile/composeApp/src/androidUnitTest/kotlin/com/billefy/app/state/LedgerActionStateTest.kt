package com.billefy.app.state

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class LedgerActionStateTest {
    @Test fun decimalValidationMatchesNumeric20Scale6WithoutFloatingPoint() {
        assertNull(validateDecimalInput("-12345678901234.123456", allowNegative = true))
        assertNull(validateDecimalInput("0", allowNegative = true))
        assertNull(validateDecimalInput("0.000000", allowNegative = true))
        assertEquals("El importe debe ser distinto de cero.", validateDecimalInput("0", allowNegative = false))
        assertEquals("El importe debe ser mayor que cero.", validateDecimalInput("-0.000000", allowNegative = false))
        assertNull(validateDecimalInput("0.000001", allowNegative = false))
        assertEquals("El importe debe ser mayor que cero.", validateDecimalInput("-1", allowNegative = false))
        assertEquals("Ingresa un importe válido con punto decimal y hasta 6 decimales.", validateDecimalInput("1e2", true))
        assertEquals("Ingresa un importe válido con punto decimal y hasta 6 decimales.", validateDecimalInput("1,25", true))
        assertEquals("El importe supera el máximo permitido.", validateDecimalInput("123456789012345", true))
        assertEquals("Ingresa un importe válido con punto decimal y hasta 6 decimales.", validateDecimalInput("1.1234567", true))
        assertNull(validateDecimalInput("0.000000", true))
    }
}
