package com.billefy.app.config

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class AndroidAppConfigTest {
    @Test
    fun rejectsMissingConfiguration() {
        assertFailsWith<IllegalArgumentException> { AndroidAppConfig.create("", "") }
    }

    @Test
    fun acceptsHttpsOriginAndNormalizesApiBase() {
        val config = AndroidAppConfig.create("https://api.example.test/", "web-client-id")
        assertEquals("https://api.example.test", config.apiBaseUrl)
        assertEquals("web-client-id", config.googleServerClientId)
    }

    @Test
    fun rejectsCredentialsQueryFragmentAndNonHttps() {
        listOf(
            "http://api.example.test",
            "https://user:pass@example.test",
            "https://api.example.test?token=x",
            "https://api.example.test/#fragment"
        ).forEach { base ->
            assertFailsWith<IllegalArgumentException> { AndroidAppConfig.create(base, "client", release = true) }
        }
    }
}
