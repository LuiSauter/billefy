# Billefy — Mobile (Kotlin Multiplatform & Compose)

Aplicación móvil desarrollada con **Kotlin Multiplatform (KMP)** y **Compose Multiplatform** para **Android** e **iOS**, compartiendo el 100% de la lógica de dominio, persistencia local y presentación.

---

## 1. Resumen de Arquitectura y Módulos

El proyecto móvil está dividido en dos módulos Gradle principales:

* **`:shared` (Kotlin Multiplatform Core)**:
  * Contiene la lógica agnóstica de plataforma (`commonMain`): tipos monetarios (`Money`), modelos de cuenta y transacciones, cola offline (outbox) con claves de idempotencia.
  * **`FinancialNotificationDetector`**: Motor clasificador on-device que analiza notificaciones bancarias entrantes, extrae montos en BOB, USD, USDT y EUR, y determina el sentido del movimiento (`Income`, `Expense`, `Transfer`).
  * **Garantía de privacidad (Regla 14 y ING-03)**: Las notificaciones no financieras son descartadas en el dispositivo; jamás se transmiten por red ni se almacenan en el backend.
* **`:composeApp` (Interfaz de Usuario)**:
  * `commonMain`: Vistas y componentes unificados en Compose Multiplatform.
  * `androidMain`: `BillefyNotificationListenerService` (`BIND_NOTIFICATION_LISTENER_SERVICE`) para la captura en segundo plano en Android, y `ProminentDisclosureScreen` (pantalla obligatoria de divulgación previa al permiso).
  * `iosMain`: Integración para el runtime de iOS en Compose Multiplatform.

---

## 2. Requisitos Previos

Asegúrate de contar con las siguientes herramientas en tu entorno:

1. **Java Development Kit (JDK) 17**:
   ```bash
   java -version
   ```
2. **Android SDK** (API Level 34):
   * Configura la variable de entorno `ANDROID_HOME` apuntando al SDK de Android.
3. **Android Studio** (Recomendado para desarrollo de interfaz y emuladores).
4. **Xcode 15+** *(Solo para compilar o ejecutar en iOS sobre macOS)*.

---

## 3. Configuración de Variables de Entorno y SDK

### A. Archivo `local.properties`
Copia la plantilla `local.properties.example` a `local.properties` en este directorio:

```bash
# En macOS / Linux
cp local.properties.example local.properties

# En Windows (CMD / PowerShell)
copy local.properties.example local.properties
```

Edita `local.properties` especificando la ruta absoluta hacia tu Android SDK:

* **macOS**:
  ```properties
  sdk.dir=/Users/TU_USUARIO/Library/Android/sdk
  ```
* **Linux**:
  ```properties
  sdk.dir=/home/TU_USUARIO/Android/Sdk
  ```
* **Windows**:
  ```properties
  sdk.dir=C\:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk
  ```

### B. Configuración de Variables de Entorno del Sistema

#### macOS y Linux (Bash / Zsh)
```bash
# Variables de Java y Android SDK
export JAVA_HOME="/ruta/a/jdk-17"
export ANDROID_HOME="$HOME/Library/Android/sdk" # o "$HOME/Android/Sdk" en Linux
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

#### Windows (PowerShell)
```powershell
$env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-17"
$env:ANDROID_HOME="C:\Users\TU_USUARIO\AppData\Local\Android\Sdk"
$env:PATH="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
```

#### Windows (Command Prompt / CMD)
```cmd
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17
set ANDROID_HOME=C:\Users\TU_USUARIO\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%
```

### C. Conexión al Backend en Desarrollo
Cuando ejecutes la app en un emulador o dispositivo físico, ten en cuenta la dirección del backend:
* **Emulador Android**: Usa `http://10.0.2.2:5000` (el alias que Android asigna al `localhost` de la computadora anfitriona).
* **Simulador iOS (macOS)**: Usa `http://localhost:5000`.
* **Dispositivo Físico (vía Wi-Fi)**: Usa la IP local de tu computadora en la red (ej. `http://192.168.1.50:5000`).

---

## 4. Comandos de Ejecución

Ubícate en el directorio `mobile/`. 

* En **macOS y Linux**, utiliza `./gradlew`.
* En **Windows**, utiliza `gradlew.bat` (o simplemente `.\gradlew` en PowerShell).

### A. Ejecutar Pruebas Automatizadas de Lógica Compartida

Ejecuta todas las pruebas unitarias del módulo `:shared` (incluyendo corpus de detección de notificaciones y modelos monetarios):

* **macOS / Linux**:
  ```bash
  ./gradlew :shared:allTests
  ```
* **Windows (PowerShell)**:
  ```powershell
  .\gradlew :shared:allTests
  ```
* **Windows (CMD)**:
  ```cmd
  gradlew.bat :shared:allTests
  ```

### B. Compilar APK de Desarrollo para Android

Genera el paquete instalable `app-debug.apk`:

* **macOS / Linux**:
  ```bash
  ./gradlew :composeApp:assembleDebug
  ```
* **Windows (PowerShell)**:
  ```powershell
  .\gradlew :composeApp:assembleDebug
  ```
* **Windows (CMD)**:
  ```cmd
  gradlew.bat :composeApp:assembleDebug
  ```

El APK resultante se genera en:
`mobile/composeApp/build/outputs/apk/debug/composeApp-debug.apk`

### C. Instalar y Ejecutar en Dispositivo o Emulador Conectado

Asegúrate de tener un emulador activo (`adb devices`):

* **macOS / Linux**:
  ```bash
  ./gradlew :composeApp:installDebug
  ```
* **Windows (PowerShell / CMD)**:
  ```powershell
  .\gradlew :composeApp:installDebug
  ```

### D. Pruebas de Simulador iOS (Solo en macOS)

* **macOS**:
  ```bash
  ./gradlew :composeApp:iosSimulatorArm64Test
  ```
