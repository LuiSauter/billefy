package com.billefy.shared.auth

import javax.crypto.KeyGenerator
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertFailsWith

class EncryptedSessionPayloadTest {
    private fun key() = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()

    @Test
    fun roundTripKeepsTokensOutOfStoredPayload() {
        val tokens = SessionTokens("access-secret", "refresh-secret", 300, "Bearer")
        val secretKey = key()
        val encrypted = EncryptedSessionPayload.encrypt(tokens, secretKey)
        assertFalse(encrypted.containsBytes(tokens.accessToken.toByteArray()))
        assertFalse(encrypted.containsBytes(tokens.refreshToken.toByteArray()))
        assertEquals(tokens, EncryptedSessionPayload.decrypt(encrypted, secretKey))
    }

    private fun ByteArray.containsBytes(needle: ByteArray): Boolean =
        indices.any { start -> start + needle.size <= size && needle.indices.all { this[start + it] == needle[it] } }

    @Test
    fun corruptedPayloadFailsClosed() {
        val secretKey = key()
        val encrypted = EncryptedSessionPayload.encrypt(
            SessionTokens("access-secret", "refresh-secret", 300, "Bearer"), secretKey
        )
        encrypted[encrypted.lastIndex] = (encrypted.last().toInt() xor 0x01).toByte()

        assertFailsWith<Exception> { EncryptedSessionPayload.decrypt(encrypted, secretKey) }
    }
}
