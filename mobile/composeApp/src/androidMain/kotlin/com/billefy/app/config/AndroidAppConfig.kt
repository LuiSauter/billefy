package com.billefy.app.config

import com.billefy.app.BuildConfig
import java.net.URI

/** Non-secret endpoints and OAuth audience; values are supplied through Gradle BuildConfig. */
class AndroidAppConfig private constructor(
    val apiBaseUrl: String,
    val googleServerClientId: String
) {
    companion object {
        fun fromBuildConfig(): AndroidAppConfig = create(
            BuildConfig.BILLEFY_API_BASE_URL,
            BuildConfig.BILLEFY_GOOGLE_SERVER_CLIENT_ID,
            release = BuildConfig.BUILD_TYPE == "release"
        )

        fun create(apiBaseUrl: String, googleServerClientId: String, release: Boolean = false): AndroidAppConfig {
            require(apiBaseUrl.isNotBlank()) { "BILLEFY_API_BASE_URL is not configured" }
            require(googleServerClientId.isNotBlank()) { "BILLEFY_GOOGLE_SERVER_CLIENT_ID is not configured" }
            val uri = try { URI(apiBaseUrl) } catch (_: Exception) {
                throw IllegalArgumentException("API base URL is invalid")
            }
            require(uri.isAbsolute && uri.host != null && uri.userInfo == null && uri.rawQuery == null && uri.rawFragment == null) {
                "API base URL must be an origin without credentials, query, or fragment"
            }
            require(uri.scheme == "https" || (!release && uri.scheme == "http")) {
                "API base URL must use HTTPS"
            }
            require(uri.rawPath.isNullOrEmpty() || uri.rawPath == "/") { "API base URL must not include a path" }
            return AndroidAppConfig("${uri.scheme}://${uri.rawAuthority}", googleServerClientId)
        }
    }
}
