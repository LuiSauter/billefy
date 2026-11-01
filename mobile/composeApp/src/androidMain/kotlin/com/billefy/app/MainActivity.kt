package com.billefy.app

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.billefy.app.auth.GoogleTokenResult
import com.billefy.app.state.LoginResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val container = (application as BillefyApplication).container
        container.controller?.start()
        setContent {
            App(
                controller = container.controller,
                configError = container.configError,
                onRequestNotificationPermission = {
                    startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                },
                onLogin = {
                    val controller = container.controller
                    val provider = container.googleProvider()
                    if (controller != null && provider != null) controller.login {
                        when (val result = withContext(Dispatchers.Main) { provider.getIdToken(this@MainActivity) }) {
                            is GoogleTokenResult.Success -> LoginResult.Success(result.idToken)
                            GoogleTokenResult.Cancelled -> LoginResult.Cancelled
                            GoogleTokenResult.ConfigurationError -> LoginResult.Failure("Falta configurar el cliente Google.")
                            GoogleTokenResult.NoCredential -> LoginResult.Failure("No hay una cuenta de Google disponible.")
                            GoogleTokenResult.Failed -> LoginResult.Failure("No se pudo obtener la credencial de Google.")
                        }
                    }
                }
            )
        }
    }
}
