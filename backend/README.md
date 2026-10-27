# Billefy — Backend (.NET 10)

Monolito modular construido en **C# / .NET 10** sobre **PostgreSQL local**, siguiendo principios estrictos de **Clean Architecture**, DDD (Domain-Driven Design), inmutabilidad contable y tipos monetarios de alta precisión (`decimal`).

---

## 1. Resumen de Arquitectura y Módulos

El backend está organizado como un monolito modular desacoplado. Los módulos no acceden a las tablas de otros módulos directamente; toda comunicación intermodular se realiza mediante contratos (`Contracts`):

* **`Ledger`**: Libro mayor, cuentas multimoneda (BOB, USD, USDT, EUR), transacciones inmutables (solo reversiones, sin `UPDATE` ni `DELETE`), saldos derivados dinámicamente.
* **`Fx`**: Snapshot de tipos de cambio del mercado paralelo (DolarApi Binance P2P) y conversión basada en la moneda de tenencia (Regla 19).
* **`Ingestion`**: Ingesta inteligente de notificaciones y extractos bancarios (CSV), deduplicación por fingerprint SHA-256 y ventana temporal, estados de borrador (`Draft`).
* **`Lending`**: Motor de préstamos con 6 esquemas de amortización, cálculo de TEA/IRR con solver numérico, mora y asignación en cascada de pagos (Golden Vectors A–H).
* **`Planning`**: Gestión de presupuestos con alertas al 80% y 100%, metas de ahorro con contribución mensual recomendada, y cálculo de salud financiera (50/30/20 ajustado por deuda).
* **`Messaging`**: Bot conversacional bidireccional de WhatsApp (inbound-only, Regla 21) con adaptadores intercambiables (`Devhooh` y `Meta Official Cloud API`).
* **`BuildingBlocks`**: Tipos fundamentales compartidos (`Money`, `Currency`, `Result`, `Error`, `IClock`).
* **`Integrations`**: Adaptadores externos aislados para DolarApi (`Billefy.Integrations.Fx`) y WhatsApp (`Billefy.Integrations.WhatsApp`).

---

## 2. Requisitos Previos

1. **.NET 10 SDK** (versión 10.0 o superior):
   ```bash
   dotnet --version
   ```
2. **PostgreSQL 16+ instalado y corriendo localmente**:
   * En **macOS**: vía **DBngin** + **TablePlus**, **Postgres.app** o `brew services start postgresql@16`.
   * En **Linux**: servicio nativo `sudo systemctl start postgresql`.
   * En **Windows**: servicio nativo de PostgreSQL o instalador oficial.
   * Base de datos requerida: `billefy-db` (o el nombre que definas en tus variables).
   * Al iniciar la API, Entity Framework Core aplica automáticamente todas las migraciones necesarias en tu base de datos local.

---

## 3. Matriz de Variables de Entorno y Configuración

**Absolutamente todas las URLs, puertos, credenciales y orígenes son configurables vía variables de entorno sin valores harcodeados en el código de producción.**

La jerarquía de `appsettings.json` se sobreescribe completamente con variables de entorno:

| Variable de Entorno (.NET / Flat) | Clave en `appsettings.json` | Descripción | Valor por Defecto |
|---|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` *(o `ConnectionStrings__PostgreSQL`)* | `ConnectionStrings:PostgreSQL` | Conexión a PostgreSQL local (DBngin/TablePlus) | `Host=localhost;Port=5432;Database=billefy-db;Username=postgres;Password=` |
| `ASPNETCORE_URLS` *(o `PORT`)* | N/A (Kestrel Host) | Protocolo, host y puerto donde escucha la API | `http://localhost:5267` |
| `CORS_ALLOWED_ORIGINS` | `Cors:AllowedOrigins` | Lista de URLs frontend separadas por coma permitidas en CORS | `http://localhost:3000,http://127.0.0.1:3000` |
| `ASPNETCORE_ENVIRONMENT` | N/A (Runtime) | Perfil de ejecución de .NET | `Development` |
| `WhatsApp__Provider` *(o `WHATSAPP_PROVIDER`)* | `WhatsApp:Provider` | Pasarela de WhatsApp (`Devhooh`, `Meta`, o `Simulated`) | `Simulated` |
| `WhatsApp__Devhooh__BaseUrl` *(o `WHATSAPP_DEVHOOH_BASEURL`)* | `WhatsApp:Devhooh:BaseUrl` | URL base de la API de mensajería Devhooh | `https://api-whp.devhooh.com` |
| `WhatsApp__Devhooh__ApiKey` *(o `WHATSAPP_DEVHOOH_APIKEY`)* | `WhatsApp:Devhooh:ApiKey` | Token Bearer para autenticar con Devhooh | `""` |
| `WhatsApp__Meta__BaseUrl` *(o `WHATSAPP_META_BASEURL`)* | `WhatsApp:Meta:BaseUrl` | URL base de la Graph API de Meta | `https://graph.facebook.com` |
| `WhatsApp__Meta__ApiVersion` *(o `WHATSAPP_META_APIVERSION`)* | `WhatsApp:Meta:ApiVersion` | Versión de la Graph API de Meta | `v21.0` |
| `WhatsApp__Meta__PhoneNumberId` *(o `WHATSAPP_META_PHONENUMBERID`)* | `WhatsApp:Meta:PhoneNumberId` | Identificador del número de teléfono en Meta Cloud | `""` |
| `WhatsApp__Meta__AccessToken` *(o `WHATSAPP_META_ACCESSTOKEN`)* | `WhatsApp:Meta:AccessToken` | Token de acceso de sistema de Meta | `""` |
| `Fx__RateSourceUrl` *(o `FX_RATESOURCEURL`)* | `Fx:RateSourceUrl` | Endpoint de cotización paralela BOB/USD | `https://bo.dolarapi.com/v1/dolares/binance` |
| `Binance__ApiKey` *(o `BINANCE_APIKEY`)* | `Binance:ApiKey` | Clave API de Binance (solo lectura obligatoria) | `""` |
| `Binance__ApiSecret` *(o `BINANCE_APISECRET`)* | `Binance:ApiSecret` | Clave secreta de Binance | `""` |

---

## 4. Configuración por Sistema Operativo

### macOS y Linux (Bash / Zsh)
```bash
# 1. Base de datos local (DBngin / TablePlus en macOS)
export DB_CONNECTION="postgres"
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_DATABASE="billefy-db"
export DB_USERNAME="postgres"
export DB_PASSWORD=""

# 2. Puerto del Servidor
export ASPNETCORE_URLS="http://localhost:5267"
# o simplemente: export PORT="5267"

# 3. Orígenes permitidos en CORS
export CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# 4. Entorno de ejecución
export ASPNETCORE_ENVIRONMENT="Development"

# 5. Proveedor de WhatsApp y credenciales
export WhatsApp__Provider="Devhooh"
export WhatsApp__Devhooh__BaseUrl="https://api-whp.devhooh.com"
export WhatsApp__Devhooh__ApiKey="tu_api_key_devhooh"

# 6. Cotización paralela DolarApi Binance P2P
export Fx__RateSourceUrl="https://bo.dolarapi.com/v1/dolares/binance"
```

### Windows (PowerShell)
```powershell
# 1. Base de datos local
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_DATABASE="billefy-db"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD=""

# 2. Puerto del Servidor
$env:ASPNETCORE_URLS="http://localhost:5267"

# 3. Orígenes permitidos en CORS
$env:CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# 4. Entorno de ejecución
$env:ASPNETCORE_ENVIRONMENT="Development"

# 5. Proveedor de WhatsApp y credenciales
$env:WhatsApp__Provider="Devhooh"
$env:WhatsApp__Devhooh__BaseUrl="https://api-whp.devhooh.com"
$env:WhatsApp__Devhooh__ApiKey="tu_api_key_devhooh"

# 6. Cotización paralela
$env:Fx__RateSourceUrl="https://bo.dolarapi.com/v1/dolares/binance"
```

### Windows (Command Prompt / CMD)
```cmd
:: 1. Base de datos local
set DB_HOST=localhost
set DB_PORT=5432
set DB_DATABASE=billefy-db
set DB_USERNAME=postgres
set DB_PASSWORD=

:: 2. Puerto del Servidor
set ASPNETCORE_URLS=http://localhost:5267

:: 3. Orígenes permitidos en CORS
set CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

:: 4. Entorno de ejecución
set ASPNETCORE_ENVIRONMENT=Development

:: 5. Proveedor de WhatsApp y credenciales
set WhatsApp__Provider=Devhooh
set WhatsApp__Devhooh__BaseUrl=https://api-whp.devhooh.com
set WhatsApp__Devhooh__ApiKey=tu_api_key_devhooh

:: 6. Cotización paralela
set Fx__RateSourceUrl=https://bo.dolarapi.com/v1/dolares/binance
```

---

## 5. Comandos de Ejecución

Ubícate en el directorio `backend/`:

### A. Restaurar Dependencias y Compilar

* **macOS / Linux / Windows**:
  ```bash
  dotnet restore
  dotnet build
  ```

### B. Ejecutar la Suite de Pruebas Automatizadas

Ejecuta todas las pruebas unitarias, de integración, preflight CORS, golden vectors matemáticos y reglas de arquitectura:

* **macOS / Linux / Windows**:
  ```bash
  dotnet test --nologo
  ```

### C. Iniciar la API del Backend

Al ejecutar la API, se conectará a tu PostgreSQL local (`billefy-db`), aplicará automáticamente todas las migraciones y escuchará en el puerto configurado (`http://localhost:5267`):

* **macOS / Linux / Windows**:
  ```bash
  dotnet run --project src/Api/Api.csproj
  ```

Verifica la API y la documentación OpenAPI en:
* Documentación OpenAPI: `http://localhost:5267/openapi/v1.json`

### D. Verificación de Formato y Estilo de Código

* **macOS / Linux / Windows**:
  ```bash
  dotnet format --verify-no-changes
  ```
