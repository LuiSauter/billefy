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
2. **PostgreSQL 16+ corriendo localmente**:
   * En **macOS**: vía **DBngin** + **TablePlus**, **Postgres.app** o `brew services start postgresql@16`.
   * En **Linux**: servicio nativo `sudo systemctl start postgresql`.
   * En **Windows**: servicio nativo de PostgreSQL.
   * Base de datos: `billefy-db` (creada en DBngin / TablePlus).
   * Al iniciar la API, Entity Framework Core aplica automáticamente todas las migraciones necesarias en tu base de datos local.

---

## 3. Variables de Entorno (.env) — Copiar y Pegar

Para configurar tu backend de inmediato, copiá y pegá cualquiera de los siguientes bloques según tu flujo de trabajo o sistema operativo:

### Opción A: Crear tu archivo `.env` directamente en la terminal (macOS / Linux)

Ubicado en la carpeta `backend/`, pegá este bloque en tu terminal para generar tu `.env` listo para usar con DBngin / TablePlus:

```bash
cat << 'EOF' > .env
# ------------------------------------------------------------------------------
# 1. Base de Datos PostgreSQL Local (DBngin / TablePlus en macOS)
# ------------------------------------------------------------------------------
DB_CONNECTION="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_DATABASE="billefy-db"
DB_USERNAME="postgres"
DB_PASSWORD=""

# ------------------------------------------------------------------------------
# 2. Puerto del Servidor y URLs de Binding
# ------------------------------------------------------------------------------
# Nota en macOS: Se utiliza 5267 para evitar el puerto 5000 reservado por AirPlay Receiver
ASPNETCORE_URLS="http://localhost:5267"
PORT="5267"

# ------------------------------------------------------------------------------
# 3. Orígenes Permitidos en CORS (Next.js)
# ------------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# ------------------------------------------------------------------------------
# 4. Entorno de Ejecución
# ------------------------------------------------------------------------------
ASPNETCORE_ENVIRONMENT="Development"

# ------------------------------------------------------------------------------
# 5. Pasarela de WhatsApp ("Devhooh", "Meta", o "Simulated")
# ------------------------------------------------------------------------------
WhatsApp__Provider="Devhooh"

# API Devhooh (https://api-whp.devhooh.com)
WhatsApp__Devhooh__BaseUrl="https://api-whp.devhooh.com"
WhatsApp__Devhooh__ApiKey="wasa_live_TU_API_KEY_AQUI"

# API Oficial WhatsApp Cloud de Meta (opcional)
WhatsApp__Meta__BaseUrl="https://graph.facebook.com"
WhatsApp__Meta__ApiVersion="v21.0"
WhatsApp__Meta__PhoneNumberId="TU_PHONE_NUMBER_ID"
WhatsApp__Meta__AccessToken="TU_ACCESS_TOKEN"

# ------------------------------------------------------------------------------
# 6. Fuente de Cotización Paralela (DolarApi Binance P2P)
# ------------------------------------------------------------------------------
Fx__RateSourceUrl="https://bo.dolarapi.com/v1/dolares/binance"

# ------------------------------------------------------------------------------
# 7. Credenciales Opcionales de Binance (Solo Lectura - Regla 18)
# ------------------------------------------------------------------------------
Binance__ApiKey="TU_BINANCE_API_KEY"
Binance__ApiSecret="TU_BINANCE_API_SECRET"

# ------------------------------------------------------------------------------
# 8. Autenticación JWT e Identidad (AUTH-01 a AUTH-07)
# ------------------------------------------------------------------------------
Jwt__Secret="billefy_super_secret_jwt_signing_key_2026_at_least_32_bytes_long!"
Jwt__Issuer="BillefyApi"
Jwt__Audience="BillefyClients"
Jwt__ExpirationMinutes="60"

# ------------------------------------------------------------------------------
# 9. Google OAuth Credentials (Único proveedor de autenticación permitido)
# ------------------------------------------------------------------------------
Google__ClientId="TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
Google__ClientSecret="TU_GOOGLE_CLIENT_SECRET"
EOF
```

---

### Opción B: Exportar Variables en la Sesión de Terminal

#### macOS y Linux (Bash / Zsh)
```bash
# 1. Base de datos local (DBngin / TablePlus)
export DB_CONNECTION="postgres"
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_DATABASE="billefy-db"
export DB_USERNAME="postgres"
export DB_PASSWORD=""

# 2. Puerto y CORS
export ASPNETCORE_URLS="http://localhost:5267"
export CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
export ASPNETCORE_ENVIRONMENT="Development"

# 3. WhatsApp y Cotización
export WhatsApp__Provider="Devhooh"
export WhatsApp__Devhooh__BaseUrl="https://api-whp.devhooh.com"
export WhatsApp__Devhooh__ApiKey="tu_api_key_devhooh"
export Fx__RateSourceUrl="https://bo.dolarapi.com/v1/dolares/binance"
```

#### Windows (PowerShell)
```powershell
# 1. Base de datos local
$env:DB_CONNECTION="postgres"
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_DATABASE="billefy-db"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD=""

# 2. Puerto y CORS
$env:ASPNETCORE_URLS="http://localhost:5267"
$env:CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
$env:ASPNETCORE_ENVIRONMENT="Development"

# 3. WhatsApp y Cotización
$env:WhatsApp__Provider="Devhooh"
$env:WhatsApp__Devhooh__BaseUrl="https://api-whp.devhooh.com"
$env:WhatsApp__Devhooh__ApiKey="tu_api_key_devhooh"
$env:Fx__RateSourceUrl="https://bo.dolarapi.com/v1/dolares/binance"
```

#### Windows (Command Prompt / CMD)
```cmd
:: 1. Base de datos local
set DB_CONNECTION=postgres
set DB_HOST=localhost
set DB_PORT=5432
set DB_DATABASE=billefy-db
set DB_USERNAME=postgres
set DB_PASSWORD=

:: 2. Puerto y CORS
set ASPNETCORE_URLS=http://localhost:5267
set CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
set ASPNETCORE_ENVIRONMENT=Development

:: 3. WhatsApp y Cotización
set WhatsApp__Provider=Devhooh
set WhatsApp__Devhooh__BaseUrl=https://api-whp.devhooh.com
set WhatsApp__Devhooh__ApiKey=tu_api_key_devhooh
set Fx__RateSourceUrl=https://bo.dolarapi.com/v1/dolares/binance
```

---

## 4. Comandos de Ejecución

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
