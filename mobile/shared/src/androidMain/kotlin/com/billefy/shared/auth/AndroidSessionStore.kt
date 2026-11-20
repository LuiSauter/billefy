package com.billefy.shared.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Encrypted private-preference storage. Any crypto or persistence failure fails closed. */
class AndroidSessionStore(context: Context) : SessionStore {
    private val preferences = context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    override suspend fun load(): SessionTokens? = synchronized(STORE_LOCK) {
        val encoded = preferences.getString(CIPHERTEXT, null) ?: return@synchronized null
        try {
            EncryptedSessionPayload.decrypt(android.util.Base64.decode(encoded, android.util.Base64.NO_WRAP), key())
        } catch (failure: Exception) {
            if (failure is KeyPermanentlyInvalidatedException) {
                val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
                keyStore.deleteEntry(KEY_ALIAS)
            }
            if (!preferences.edit().remove(CIPHERTEXT).commit()) {
                throw IllegalStateException("Unable to clear invalid session data")
            }
            throw IllegalStateException("Stored session is invalid; sign in again")
        }
    }

    override suspend fun save(tokens: SessionTokens) = synchronized(STORE_LOCK) {
        val encrypted = EncryptedSessionPayload.encrypt(tokens, key())
        val encoded = android.util.Base64.encodeToString(encrypted, android.util.Base64.NO_WRAP)
        check(preferences.edit().putString(CIPHERTEXT, encoded).commit()) {
            "Unable to save encrypted session"
        }
    }

    override suspend fun clear() = synchronized(STORE_LOCK) {
        check(preferences.edit().remove(CIPHERTEXT).commit()) { "Unable to clear session" }
    }

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(
                KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setRandomizedEncryptionRequired(true)
                    .build()
            )
            generateKey()
        }
    }

    private companion object {
        const val PREFERENCES = "encrypted_session"
        const val CIPHERTEXT = "session_ciphertext"
        const val KEY_ALIAS = "billefy_session_aes_gcm"
        val STORE_LOCK = Any()
    }
}

/** Pure JVM-testable AES-GCM envelope and bounded token encoding. */
internal object EncryptedSessionPayload {
    private const val IV_SIZE = 12
    private const val TAG_BITS = 128
    private const val MAX_FIELD_BYTES = 16 * 1024

    fun encrypt(tokens: SessionTokens, key: SecretKey): ByteArray {
        val plain = ByteArrayOutputStream().also { bytes ->
            DataOutputStream(bytes).use { out ->
                out.writeField(tokens.accessToken)
                out.writeField(tokens.refreshToken)
                out.writeInt(tokens.expiresIn)
                out.writeField(tokens.tokenType)
            }
        }.toByteArray()
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        return cipher.iv + cipher.doFinal(plain)
    }

    fun decrypt(payload: ByteArray, key: SecretKey): SessionTokens {
        require(payload.size > IV_SIZE) { "Invalid encrypted session" }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(TAG_BITS, payload.copyOfRange(0, IV_SIZE)))
        val input = DataInputStream(ByteArrayInputStream(cipher.doFinal(payload.copyOfRange(IV_SIZE, payload.size))))
        return SessionTokens(input.readField(), input.readField(), input.readInt(), input.readField()).also {
            require(input.available() == 0 && it.expiresIn > 0) { "Invalid session payload" }
        }
    }

    private fun DataOutputStream.writeField(value: String) {
        val bytes = value.toByteArray(Charsets.UTF_8)
        require(bytes.isNotEmpty() && bytes.size <= MAX_FIELD_BYTES) { "Invalid session field" }
        writeInt(bytes.size)
        write(bytes)
    }

    private fun DataInputStream.readField(): String {
        val size = readInt()
        require(size in 1..MAX_FIELD_BYTES && size <= available()) { "Invalid session field" }
        return ByteArray(size).also(::readFully).toString(Charsets.UTF_8)
    }
}
