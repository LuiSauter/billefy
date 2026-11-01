package com.billefy.app.auth

import android.app.Activity
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import kotlinx.coroutines.CancellationException

sealed interface GoogleTokenResult {
    data class Success(val idToken: String) : GoogleTokenResult
    data object Cancelled : GoogleTokenResult
    data object NoCredential : GoogleTokenResult
    data object ConfigurationError : GoogleTokenResult
    data object Failed : GoogleTokenResult
}

/** Stateless adapter; Activity is used only for the interactive Credential Manager request. */
class GoogleIdTokenProvider(private val serverClientId: String) {
    suspend fun getIdToken(activity: Activity): GoogleTokenResult {
        if (serverClientId.isBlank()) return GoogleTokenResult.ConfigurationError
        return try {
            val option = GetGoogleIdOption.Builder()
                .setServerClientId(serverClientId)
                .setFilterByAuthorizedAccounts(false)
                .setAutoSelectEnabled(false)
                .build()
            val result = CredentialManager.create(activity).getCredential(
                context = activity,
                request = GetCredentialRequest.Builder().addCredentialOption(option).build()
            )
            val credential = result.credential
            if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                GoogleTokenResult.Success(GoogleIdTokenCredential.createFrom(credential.data).idToken)
            } else {
                GoogleTokenResult.NoCredential
            }
        } catch (cancellation: CancellationException) {
            throw cancellation
        } catch (_: GetCredentialCancellationException) {
            GoogleTokenResult.Cancelled
        } catch (_: NoCredentialException) {
            GoogleTokenResult.NoCredential
        } catch (_: GoogleIdTokenParsingException) {
            GoogleTokenResult.Failed
        } catch (_: Exception) {
            GoogleTokenResult.Failed
        }
    }
}
